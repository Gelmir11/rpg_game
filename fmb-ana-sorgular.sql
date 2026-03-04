-- ============================================================================
-- NUM_NITELIK_KACAK_YENI.fmb - FMB İÇİNDEKİ ANA SORGULAR
-- Binary'den çıkarılmıştır, bazı kısımlar binary kopukluğundan 
-- dolayı rekonstrükte edilmiştir (= işaretleri, tablo isimleri vb.)
-- ============================================================================


-- ============================================================================
-- SORGU 1: NİTELİK KAÇAK - BAGIMSIZ_NO BOŞ OLANLAR
-- Buton: BLOCK3.NITELIK_KACAK_BAGIMSIZ_BOS
-- Amaç: EML_BEYAN'da bağımsız no boş olan kayıtları adres üzerinden
--        NUM_BAGIMSIZ_BOLUM_W ile eşleştirip nitelik farklarını bulur
-- ============================================================================

CURSOR KONTROL IS
SELECT A.*, 
       B.BAGIMSIZ_NO          WIEV_BAGIMSIZ_NO,
       B.MAHALLE_KODU         WIEV_MAHALLE_KODU,
       B.CADDE_SOKAK_KODU     WIEV_CADDE_SOKAK_KODU,
       B.Kullanim_Sekli       WIEV_Kullanim_Sekli,
       B.Yuzolcumu            WIEV_Yuzolcumu,
       B.Kalorifer_EH         WIEV_Kalorifer_EH,
       B.Asansor_EH           WIEV_Asansor_EH
  FROM EML_BEYAN A, NUM_BAGIMSIZ_BOLUM_W B
 WHERE A.MAHALLE_KODU          = B.MAHALLE_KODU
   AND A.CADDE_SOKAK_KODU      = B.CADDE_SOKAK_KODU
   AND NVL(A.KAPI_NO,0)        = NVL(B.KAPI_NO,0)
   AND NVL(A.ALT_KAPI_NO,' ')  = NVL(B.ALT_KAPI_NO,' ')
   AND NVL(A.DAIRE_NO,0)       = NVL(B.DAIRE_NO,0)
   AND A.DONEM_KODU            = (SELECT MAX(DONEM_KODU) FROM EML_DONEM)
   AND A.BEYAN_TURU            = 1
   AND A.SATIS_TARIHI          IS NULL
   AND A.BAGIMSIZ_NO           IS NULL        -- << BAGIMSIZ_NO BOŞ
   AND B.KAPANIS_TARIHI        IS NULL
   AND 1 = (SELECT COUNT(*)                   -- << Tek eşleşme garantisi
              FROM NUM_BAGIMSIZ_BOLUM_W C
             WHERE A.MAHALLE_KODU          = C.MAHALLE_KODU
               AND A.CADDE_SOKAK_KODU      = C.CADDE_SOKAK_KODU
               AND NVL(A.KAPI_NO,0)        = NVL(C.KAPI_NO,0)
               AND NVL(A.ALT_KAPI_NO,' ')  = NVL(C.ALT_KAPI_NO,' ')
               AND NVL(A.DAIRE_NO,0)       = NVL(C.DAIRE_NO,0))
 ORDER BY A.Sicil_Kodu, A.Beyan_Sirasi;


-- ============================================================================
-- SORGU 2: NİTELİK KAÇAK - BAGIMSIZ_NO DOLU OLANLAR
-- Buton: BLOCK3.NITELIK_KACAK_BAGIMSIZ_DOLU
-- Amaç: Aynı kontrol ama bağımsız no üzerinden doğrudan eşleşir
-- ============================================================================

CURSOR KONTROL IS
SELECT A.*, 
       B.BAGIMSIZ_NO          WIEV_BAGIMSIZ_NO,
       B.MAHALLE_KODU         WIEV_MAHALLE_KODU,
       B.CADDE_SOKAK_KODU     WIEV_CADDE_SOKAK_KODU,
       B.Kullanim_Sekli       WIEV_Kullanim_Sekli,
       B.Yuzolcumu            WIEV_Yuzolcumu,
       B.Kalorifer_EH         WIEV_Kalorifer_EH,
       B.Asansor_EH           WIEV_Asansor_EH
  FROM EML_BEYAN A, NUM_BAGIMSIZ_BOLUM_W B
 WHERE A.BAGIMSIZ_NO           = B.BAGIMSIZ_NO   -- << Doğrudan eşleşme
   AND A.DONEM_KODU            = (SELECT MAX(DONEM_KODU) FROM EML_DONEM)
   AND A.BEYAN_TURU            = 1
   AND A.SATIS_TARIHI          IS NULL
   AND A.BAGIMSIZ_NO           IS NOT NULL    -- << BAGIMSIZ_NO DOLU
   AND B.KAPANIS_TARIHI        IS NULL
 ORDER BY A.Sicil_Kodu, A.Beyan_Sirasi;


-- ============================================================================
-- Her iki sorgu için ortak NİTELİK KONTROL MANTIĞI (PL/SQL Loop içinde):
-- ============================================================================

/*
FOR K IN KONTROL LOOP

  -- 1) KALORİFER KAÇAĞI
  SELECT T.Kalorifer_Eh INTO DetayKalorifer
    FROM NUM_BINA_DETAY B, NUM_ISITMA_TURU T
   WHERE B.Bagimsiz_No = K.WIEV_Bagimsiz_No
     AND B.ISITMA_TURU = T.ISITMA_TURU;

  IF NVL(K.Bina_Kalorifer,'H') = 'H' THEN
    IF DetayKalorifer IS NOT NULL AND DetayKalorifer = 'E' THEN
      TEMP_KALORIFER_KACAK_EH := 'E';
    ELSIF DetayKalorifer IS NULL AND NVL(K.WIEV_Kalorifer_EH,'H') = 'E' THEN
      TEMP_KALORIFER_KACAK_EH := 'E';
    END IF;
  END IF;

  -- 2) ASANSÖR KAÇAĞI
  IF NVL(K.Bina_Asansor,'H') = 'H' AND NVL(K.WIEV_Asansor_EH,'H') = 'E' THEN
    TEMP_ASANSOR_KACAK_EH := 'E';
  END IF;

  -- 3) M² KAÇAĞI
  IF NVL(K.WIEV_Yuzolcumu,0) <= 1000 THEN
    TEMP_BEYAN_M2  := ROUND(K.Bina_Yuzolcumu 
                        * (NVL(K.Bina_Hissesi,1) / NVL(K.Bina_Orani,1))
                        * (NVL(K.Bina_Hissesi_1,1) / NVL(K.Bina_Orani_1,1)), 2);
    TEMP_DETAY_M2  := ROUND(K.WIEV_Yuzolcumu 
                        * (NVL(K.Bina_Hissesi,1) / NVL(K.Bina_Orani,1))
                        * (NVL(K.Bina_Hissesi_1,1) / NVL(K.Bina_Orani_1,1)), 2);
    IF NVL(TEMP_DETAY_M2,0) > NVL(TEMP_BEYAN_M2,0) THEN
      TEMP_M2_KACAK_EH := 'E';
    END IF;
  END IF;

  -- 4) YOL (ADRES) KAÇAĞI
  IF K.WIEV_CADDE_SOKAK_KODU IS NOT NULL AND
     LPAD(K.WIEV_CADDE_SOKAK_KODU,8,0) <> LPAD(K.CADDE_SOKAK_KODU,8,0) THEN
    TEMP_YOL_KACAK_EH := 'E';
  END IF;

  -- 5) MESKEN/İŞYERİ KAÇAĞI
  SELECT NVL(Isyeri_EH,'H') INTO Temp_Bina_Detay_Isyeri_EH
    FROM Num_Bina_Detay
   WHERE Bagimsiz_No = K.WIEV_Bagimsiz_No;

  IF K.Kullanim_Sekli = 22 AND NVL(Temp_Bina_Detay_Isyeri_EH,'H') = 'E' THEN
    TEMP_MESKEN_ISYERI_KACAK_EH := 'E';
  END IF;

  -- Herhangi bir kaçak varsa NUM_EMLAK_NITELIK_KACAK'a yaz
  IF NVL(TEMP_KALORIFER_KACAK_EH,'H') = 'E' OR
     NVL(TEMP_ASANSOR_KACAK_EH,'H') = 'E' OR
     NVL(TEMP_M2_KACAK_EH,'H') = 'E' OR
     NVL(TEMP_YOL_KACAK_EH,'H') = 'E' OR
     NVL(TEMP_MESKEN_ISYERI_KACAK_EH,'H') = 'E' THEN

    INSERT INTO NUM_EMLAK_NITELIK_KACAK (...) VALUES (...);
    COMMIT;
  END IF;

END LOOP;
*/


-- ============================================================================
-- SORGU 3: İŞYERİ KAÇAĞI (ÇTV + İRV + İAÇ)
-- Buton: BLOCK3.ISYERI_KACAK_CTV_IRV_IAC
-- Amaç: İşyeri olan yerlerde ÇTV/İRV/İAÇ kaydı olmayanları bulur
-- ============================================================================

-- Ana veri kaynağı:
SELECT B.*, C.MAHALLE_KODU, C.CADDE_SOKAK_KODU, C.KAPI_NO, C.ALT_KAPI_NO
  FROM NUM_BINA A, NUM_BINA_DETAY B, NUM_BINA_ADRES C
 WHERE A.BINA_NO              = B.BINA_NO
   AND A.BINA_NO              = C.BINA_NO
   AND B.BINA_NO              = C.BINA_NO
   AND B.ADRES_NO             = C.ADRES_NO
   AND NVL(B.ISYERI_EH,'H')  = 'E'
   AND A.KAPANIS_TARIHI       IS NULL
 ORDER BY B.BAGIMSIZ_NO;

/*
FOR K IN KONTROL LOOP

  -- Ruhsat kontrolü
  SELECT Ruhsatli_EH, Sihhi, GSihhi
    INTO Temp_Ruhsat_EH, Temp_Ruhsat_Sh_EH, Temp_Ruhsat_Gs_EH
    FROM Num_Bina_Detay_Kullanim
   WHERE Kullanim_Kodu = K.Bina_Kullanim_Turu
     AND NVL(Ruhsatli_EH,'H') = 'E';

  IF NVL(Temp_Ruhsat_EH,'H') = 'E' THEN

    -- A) ÇTV KAÇAK KONTROLÜ
    -- Koşul: Personel/koltuk/öğrenci/yatak/yüzölçüm > 0
    IF (NVL(K.CALISAN_KISI_ADEDI,0) + NVL(K.KOLTUK_ADEDI,0) + 
        NVL(K.OGRENCI_ADEDI,0) + NVL(K.PERSONEL_ADEDI,0) + 
        NVL(K.YATAK_ADEDI,0) + NVL(K.YUZOLCUMU,0)) > 0 THEN

      -- Önce bağımsız no ile kontrol
      SELECT COUNT(*) INTO Ctv_Var
        FROM CTV_BEYAN
       WHERE Yili = 2018
         AND Bagimsiz_No = K.Bagimsiz_No
         AND Mukellefiyet_Bitis_Tarihi IS NULL;

      -- Bulunamazsa adresle kontrol
      IF NVL(Ctv_Var,0) = 0 THEN
        SELECT COUNT(*) INTO Ctv_Var
          FROM CTV_BEYAN
         WHERE Yili               = 2018
           AND MAHALLE_KODU       = K.MAHALLE_KODU
           AND CADDE_SOKAK_KODU   = K.CADDE_SOKAK_KODU
           AND NVL(KAPI_NO,0)     = NVL(K.KAPI_NO,0)
           AND NVL(ALT_KAPI_NO,' ') = NVL(K.ALT_KAPI_NO,' ')
           AND NVL(DAIRE_NO,0)    = NVL(K.DAIRE_NO,0)
           AND Mukellefiyet_Bitis_Tarihi IS NULL;
      END IF;

      IF NVL(Ctv_Var,0) = 0 THEN Ctv_Kacak := 'E'; END IF;
    END IF;

    -- B) İRV KAÇAK KONTROLÜ
    -- Koşul: Işıklı veya ışıksız levha m² > 0
    IF (NVL(K.ISIKLI_LEVHA_M2,0) + NVL(K.ISIKSIZ_LEVHA_M2,0)) > 0 THEN

      SELECT COUNT(*) INTO Irv_Var
        FROM IRV_BEYAN
       WHERE Yili = 2018
         AND Bagimsiz_No = K.Bagimsiz_No
         AND Mukellefiyet_Bitis_Tarihi IS NULL;

      IF NVL(Irv_Var,0) = 0 THEN
        SELECT COUNT(*) INTO Irv_Var
          FROM IRV_BEYAN
         WHERE Yili               = 2018
           AND MAHALLE_KODU       = K.MAHALLE_KODU
           AND CADDE_SOKAK_KODU   = K.CADDE_SOKAK_KODU
           AND NVL(KAPI_NO,0)     = NVL(K.KAPI_NO,0)
           AND NVL(ALT_KAPI_NO,' ') = NVL(K.ALT_KAPI_NO,' ')
           AND NVL(DAIRE_NO,0)    = NVL(K.DAIRE_NO,0)
           AND Mukellefiyet_Bitis_Tarihi IS NULL;
      END IF;

      IF NVL(Irv_Var,0) = 0 THEN Irv_Kacak := 'E'; END IF;
    END IF;

    -- C) İAÇ KAÇAK KONTROLÜ
    -- Koşul: Sıhhi veya gayrisıhhi ruhsat gerekiyor
    IF NVL(Temp_Ruhsat_Sh_EH,'H') = 'E' OR NVL(Temp_Ruhsat_Gs_EH,'H') = 'E' THEN

      SELECT COUNT(*) INTO Iac_Var
        FROM IAC_BASVURU
       WHERE Bagimsiz_No = K.Bagimsiz_No
         AND Kapanis_Tarihi IS NULL;

      IF NVL(Iac_Var,0) = 0 THEN
        SELECT COUNT(*) INTO Iac_Var
          FROM IAC_BASVURU
         WHERE MAHALLE_KODU       = K.MAHALLE_KODU
           AND CADDE_SOKAK_KODU   = K.CADDE_SOKAK_KODU
           AND NVL(KAPI_NO,0)     = NVL(K.KAPI_NO,0)
           AND NVL(ALT_KAPI_NO,' ') = NVL(K.ALT_KAPI_NO,' ')
           AND NVL(DAIRE_NO,0)    = NVL(K.DAIRE_NO,0)
           AND Kapanis_Tarihi IS NULL;
      END IF;

      IF NVL(Iac_Var,0) = 0 THEN Iac_Kacak := 'E'; END IF;
    END IF;

    -- Herhangi bir kaçak varsa NUM_CTV_IRV_IAC_KACAK'a yaz
    IF NVL(Ctv_Kacak,'H') = 'E' OR NVL(Irv_Kacak,'H') = 'E' 
       OR NVL(Iac_Kacak,'H') = 'E' THEN
      INSERT INTO NUM_CTV_IRV_IAC_KACAK (...) VALUES (...);
      COMMIT;
    END IF;

  END IF;
END LOOP;
*/


-- ============================================================================
-- SORGU 4: BİNA KAÇAĞI - VATANDAŞLIK NO DOLU
-- Buton: BLOCK3.BINA_KACAK_VATANDASLIK_NO_DOLU
-- Amaç: Tapuda kaydı olan ama emlak beyanı olmayan binaları bulur
-- ============================================================================

CURSOR BAGIMSIZ IS
SELECT A.*
  FROM TAPU_OZET_08112018 A
 WHERE NVL(A.KAPANMA,0)   = 0
   AND A.VATANDASLIK_NO    IS NOT NULL
   AND 'X' NOT IN (SELECT 'X' FROM NUM_BINA_KACAK B
                    WHERE A.TAPU_OZET_ID = B.TAPU_OZET_ID)
 ORDER BY A.TAPU_OZET_ID;

/*
FOR K IN BAGIMSIZ LOOP

  -- Bağımsız bölüm bilgilerini al
  SELECT Kullanim_Sekli, Kalorifer_EH, Asansor_EH, Insaat_Sinifi, Insaat_Turu
    INTO WIEV_Kullanim_Sekli, WIEV_Kalorifer_EH, WIEV_Asansor_EH, 
         WIEV_Insaat_Sinifi, WIEV_Insaat_Turu
    FROM NUM_BAGIMSIZ_BOLUM_W
   WHERE BAGIMSIZ_NO    = K.BOLUM_ID
     AND KAPANIS_TARIHI IS NULL;

  -- Mevcut beyan var mı kontrol et
  SELECT COUNT(*) INTO Temp_Beyan_Var
    FROM EML_BEYAN
   WHERE BAGIMSIZ_NO = K.BOLUM_ID
     AND Donem_Kodu  = 2018
     AND Beyan_Turu  = 1
     AND Satis_Tarihi IS NULL;

  -- Beyan yoksa adresle de kontrol et
  IF NVL(Temp_Beyan_Var,0) = 0 THEN
    SELECT COUNT(*) INTO Temp_Beyan_Var
      FROM EML_BEYAN A, NUM_BAGIMSIZ_BOLUM_W B
     WHERE A.MAHALLE_KODU          = B.MAHALLE_KODU
       AND A.CADDE_SOKAK_KODU      = B.CADDE_SOKAK_KODU
       AND NVL(A.KAPI_NO,0)        = NVL(B.KAPI_NO,0)
       AND NVL(A.ALT_KAPI_NO,0)    = NVL(B.ALT_KAPI_NO,0)
       AND NVL(A.DAIRE_NO,0)       = NVL(B.DAIRE_NO,0)
       AND NVL(A.BLOK_NO,' ')      = NVL(B.BLOK_NO,' ')
       AND A.Donem_Kodu            = 2018
       AND A.Beyan_Turu            = 1
       AND B.Bagimsiz_No           = K.BOLUM_ID
       AND A.Satis_Tarihi          IS NULL
       AND B.Kapanis_Tarihi        IS NULL;
  END IF;

  -- Hâlâ beyan yoksa → kaçak olarak kaydet
  IF NVL(Temp_Beyan_Var,0) = 0 THEN

    -- Kalorifer bilgisini al
    SELECT T.Kalorifer_Eh INTO TempKalorifer
      FROM NUM_BINA_DETAY B, NUM_ISITMA_TURU T
     WHERE B.Bagimsiz_No = K.Bolum_Id
       AND B.ISITMA_TURU = T.ISITMA_TURU;

    -- Sicil eşleştirmesi (vatandaşlık no ile)
    CURSOR Sicil IS 
      SELECT Sicil_Kodu
        FROM ORT_SICIL
       WHERE VATANDASLIK_NO = TO_CHAR(K.VATANDASLIK_NO)
         AND ADI    NOT IN ('BOŞ')
         AND SOYADI NOT IN ('BOŞ')
       ORDER BY Kayit_Tarihi DESC;

    -- Çoklu sicil varsa virgülle birleştir
    FOR S IN Sicil LOOP
      TempSayi := NVL(TempSayi,0) + 1;
      IF NVL(TempSayi,0) = 1 THEN
        Temp_Sicil := S.Sicil_Kodu;
        Temp_Coklu_Sicil := S.Sicil_Kodu;
      ELSE
        Temp_Coklu_Sicil := Temp_Coklu_Sicil || ',' || S.Sicil_Kodu;
      END IF;
    END LOOP;

    INSERT INTO NUM_BINA_KACAK (
      BAGIMSIZ_NO, SICIL_KODU, TAPU_OZET_ID, ADI, SOYADI,
      IKTISAP_TARIHI, INSAAT_TARIHI, ISLEM_TARIHI,
      KACAK_EH, INSAAT_SINIFI, INSAAT_TURU, KULLANIM_SEKLI,
      YUZOLCUMU, BINA_HISSE, BINA_ORAN, KAYDEDEN, KAYIT_TARIHI,
      ARSA_HISSE, ARSA_ORAN, ASANSOR_EH, ISINMA_EH, COKLU_SICIL_KODU
    ) VALUES (
      K.BOLUM_ID, Temp_Sicil, K.TAPU_OZET_ID, K.ADI, K.SOYADI,
      TO_CHAR(NVL(K.GUNTAH,SYSDATE),'DD/MM/YYYY'),
      TO_CHAR(NVL(K.GUNTAH,SYSDATE),'DD/MM/YYYY'),
      TO_CHAR(SYSDATE,'DD/MM/YYYY'),
      'E', WIEV_Insaat_Sinifi, WIEV_Insaat_Turu, WIEV_Kullanim_Sekli,
      NULL, NULL, NULL, NULL, NULL,
      NULL, NULL,
      NVL(WIEV_Asansor_EH,'H'), NVL(TempKalorifer,'H'), Temp_Coklu_Sicil
    );
    COMMIT;
  END IF;

END LOOP;
*/


-- ============================================================================
-- SORGU 5: TAPU ÖZET EŞLEŞTİRME
-- Buton: BLOCK3.TAPU_OZET_ESLE
-- Amaç: Tapu kayıtlarını numaratajdaki bağımsız bölümlerle eşleştirir
-- ============================================================================

CURSOR BAGIMSIZ IS
SELECT A.*
  FROM TAPU_OZET_08112018 A
 WHERE NVL(A.KAPANMA,'0') = 0
   AND A.BOLUM_ID          IS NULL
   AND A.MUSBOLNO           IS NOT NULL
   AND A.PARSEL_ID          IS NOT NULL
 ORDER BY A.TAPU_OZET_ID;

/*
FOR D IN BAGIMSIZ LOOP

  -- Parsel üzerinden bina bul
  SELECT P.BINA_NO INTO Temp_Bina_No
    FROM Num_Bina_Parsel P, Num_Bina B
   WHERE P.BINA_NO       = B.BINA_NO
     AND P.Parsel_Kodu   = D.PARSEL_ID
     AND NVL(D.Blok_No,' ') = NVL(B.Blok_No,' ')
     AND NVL(Aktif_Mi,'0') = '0';

  -- Bina üzerinden bağımsız bölüm bul
  IF Temp_Bina_No IS NOT NULL THEN
    SELECT Bagimsiz_No INTO Temp_Bagimsiz_No
      FROM Num_Bina_Detay
     WHERE BINA_NO        = Temp_Bina_No
       AND Kapanis_Tarihi IS NULL;

    -- Eşleştirmeyi yaz
    IF Temp_Bagimsiz_No IS NOT NULL THEN
      UPDATE TAPU_OZET_08112018
         SET Bolum_Id = Temp_Bagimsiz_No
       WHERE TAPU_OZET_Id = D.TAPU_OZET_Id
         AND Bolum_Id IS NULL;
      COMMIT;
    END IF;
  END IF;

END LOOP;
*/


-- ============================================================================
-- SORGU 6: DAİRE NO DÜZELTME
-- Buton: BLOCK3.DAIRE_NO_DUZELT
-- Amaç: ALT_DAIRE_NO'daki rakamları çıkarıp DAIRE_NO'ya yazar
-- ============================================================================

CURSOR DAIRE_KONTROL IS
SELECT A.*
  FROM EML_BEYAN A
 WHERE A.DONEM_KODU   = 2018
   AND A.BEYAN_TURU   = 1
   AND SUBSTR(A.ALT_DAIRE_NO,1,1) IN ('0','1','2','3','4','5','6','7','8','9')
   AND A.DAIRE_NO     IS NULL
   AND A.ALT_DAIRE_NO IS NOT NULL
   AND A.SATIS_TARIHI IS NULL
   AND A.BAGIMSIZ_NO  IS NULL
 ORDER BY A.Sicil_Kodu, A.Beyan_Sirasi;

/*
FOR D IN DAIRE_KONTROL LOOP
  -- ALT_DAIRE_NO içindeki rakamları çıkar
  Donen := '';
  FOR Basla IN 1..LENGTH(D.ALT_DAIRE_NO) LOOP
    Ara := SUBSTR(D.ALT_DAIRE_NO, Basla, 1);
    IF Ara IN ('1','2','3','4','5','6','7','8','9','0') THEN
      Donen := Donen || Ara;
    END IF;
  END LOOP;

  UPDATE EML_BEYAN
     SET DAIRE_NO = Donen
   WHERE SICIL_KODU   = D.SICIL_KODU
     AND DONEM_KODU   = D.DONEM_KODU
     AND BEYAN_TURU   = D.BEYAN_TURU
     AND BEYAN_SIRASI = D.BEYAN_SIRASI;
  COMMIT;
END LOOP;
*/


-- ============================================================================
-- YARDIMCI FONKSİYON: FNC_NUMBER_CEVIR
-- Metinden sadece rakamları çıkarır, rakam yoksa '0' döner
-- ============================================================================

/*
FUNCTION FNC_NUMBER_CEVIR(Gelen VARCHAR2) RETURN VARCHAR2 IS
  Donen VARCHAR2(100);
  Ara   VARCHAR2(1);
  Say   NUMBER;
BEGIN
  IF Gelen IS NOT NULL THEN
    Say := LENGTH(Gelen);
    IF NVL(Say,0) > 0 THEN
      FOR Basla IN 1..Say LOOP
        Ara := SUBSTR(Gelen, Basla, 1);
        IF Ara NOT IN ('1','2','3','4','5','6','7','8','9','0') THEN
          NULL; -- rakam değilse atla
        ELSE
          Donen := Donen || Ara;
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NVL(Donen, '0');
END;
*/