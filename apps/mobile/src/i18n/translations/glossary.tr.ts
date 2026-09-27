import type { glossaryEn } from "./glossary.en";

/** Sözlük metinleri — bkz. glossary.en.ts. */
export const glossaryTr: typeof glossaryEn = {
  ui: {
    whatIs: "Bu nedir?",
    goDeeper: "Daha derine in",
    showLess: "Daha az göster",
    whatTitle: "Nedir",
    howTitle: "Nasıl hesaplanır",
    lifeTitle: "Sana ne anlatır",
    exampleTitle: "Örneğin",
    yoursTitle: "Senin haritanda",
    relatedTitle: "İlgili",
    screenTitle: "Sözlük",
    screenEyebrow: "Astroloji, sade dille",
    screenSub: "Uygulamada geçen her kelime, anlaşılır bir dille — istediğinde altındaki detayla birlikte.",
    searchPlaceholder: "Bir terim ara",
    noResults: "Bununla eşleşen bir terim yok.",
    openGlossary: "Sözlük",
    openGlossarySub: "Tüm terimler, açıklamalarıyla",
  },
  yours: {
    natalChart: "{{date}}, saat {{time}}, {{place}} için çıkarıldı.",
    bigThree: "Seninkiler: {{sun}} Güneş, {{moon}} Ay, {{rising}} Yükselen.",
    sun: "Güneşin {{sign}} burcunda ({{deg}}), {{house}}inde.",
    moon: "Ayın {{sign}} burcunda ({{deg}}), {{house}}inde.",
    rising: "Yükselenin {{sign}}, {{deg}} derecesinde.",
    midheaven: "Kariyer noktan {{sign}} burcunda.",
    planet: "Haritanda sesi en çok çıkan gezegen: {{planet}}.",
    house: "En kalabalık alanın {{house}}; içinde {{n}} gezegen var.",
    aspect: "Haritanda {{n}} önemli bağlantı var. En sıkısı: {{phrase}}.",
    orb: "En sıkı bağlantın tam açıdan yalnızca {{orb}}° uzakta: {{phrase}}.",
    retrograde: "Doğduğunda geri giden gezegenler: {{list}}.",
    retrogradeNone: "Doğduğunda gezegenlerinin hiçbiri geri gitmiyordu.",
    northNode: "Kuzey Ay Düğümün {{sign}} burcunda, {{house}}inde.",
    saturnReturn: "İlk Satürn dönüşün yaklaşık {{age}} yaşında.",
    day: "Gündüz doğmuşsun — Güneş ufkun üstündeydi.",
    night: "Hava karardıktan sonra doğmuşsun — Güneş ufkun altındaydı.",
  },
  terms: {
    natalChart: {
      title: "Doğum haritası",
      short: "Doğduğun dakikada, doğduğun yerden görünen gökyüzünün haritası.",
      what:
        "Doğduğun yerde durduğunu ve ilk nefesini aldığın anda gökyüzünü dondurduğunu düşün. Doğum haritası (natal harita) bu anın bir daire olarak çizilmiş hâlidir: Güneş, Ay ve gezegenler neredeydi, her biri hangi burçtaydı ve gökyüzünün hangi bölümündeydi.",
      how:
        "Doğum tarihin, saatin ve yerin, astronomik tablolar (efemeris) kullanılarak gezegenlerin kesin konumlarına çevrilir. Saat ve yer ayrıca ufku belirler — doğuda hangi burcun yükseldiğini — ve bu da daireyi on iki eve böler. Doğum saatinin önemi buradan gelir: aynı gün birkaç saat arayla doğan iki kişinin haritası farklıdır.",
      life:
        "Astroloji haritayı bir mizaç portresi olarak okur: seni ne harekete geçirir (Güneş), kendini güvende hissetmek için neye ihtiyaç duyarsın (Ay), dünyayla nasıl tanışırsın (Yükselen) ve diğer enerjilerin birbiriyle nasıl anlaşır ya da çatışır. Harita değişmez — uygulamadaki her şey onunla karşılaştırılır.",
      example:
        "Sana Özel sekmesinde (Haritan → \"Haritanı çark olarak gör\") açılan çark senin doğum haritan. Halkadaki her sembol, burcundaki bir gezegen.",
    },
    bigThree: {
      title: "Büyük Üçlü",
      short: "Güneş, Ay ve Yükselen burcun — bir haritayı anlamanın en hızlı üç anahtarı.",
      what:
        "Çoğu insan yalnızca Güneş burcunu bilir (\"Ben Aslan'ım\"). Büyük Üçlü buna Ay ve Yükselen burcu ekler; üçü birlikte bir insanı tek başlarına olduklarından çok daha iyi anlatır.",
      how:
        "Güneş burcu doğum tarihinden gelir. Ay her 2-3 günde bir burç değiştirir, bu yüzden tarih ve yaklaşık saat gerekir. Yükselen yaklaşık her iki saatte bir değişir, bu yüzden kesin doğum saati ve yeri gerekir.",
      life:
        "Onları öz, kalp ve ön kapı gibi düşün: Güneş olmaya çalıştığın kişi, Ay nasıl hissettiğin ve nasıl dinlendiğin, Yükselen ise bıraktığın ilk izlenim ve işlere başlama biçimin.",
      example:
        "Oğlak Güneş, Balık Ay, Aslan Yükselen biri dışarıdan kendinden emin ve sıcak görünür, içten hırslıdır, derinde ise sessizce hassastır.",
    },
    sun: {
      title: "Güneş",
      short: "Özün — büyüyüp dönüşmek için burada olduğun kişi.",
      what:
        "Güneş, güneş sisteminin merkezi olduğu gibi haritanın da merkezidir. İnsanlar \"burcun ne?\" diye sorduğunda kastettikleri, Güneş'in bulunduğu burçtur.",
      how:
        "Güneş yılda bir kez on iki burcun hepsinden geçer ve her birinde yaklaşık bir ay kalır; bu yüzden doğum tarihi yeterlidir. İki burcun sınırına (kuspa) yakın doğanlarda kesin saat belirleyicidir.",
      life:
        "İçindeki itici gücü, amaç duygunu ve seni en çok \"kendin gibi\" hissettiren şeyi gösterir. Bulunduğu ev, hayatın hangi alanında parlamak istediğini anlatır.",
      example:
        "Koç'ta Güneş: bir şeyleri başlatma ve öncülük etme ihtiyacı. Yengeç'te Güneş: korumak ve bir yuva kurmak.",
    },
    moon: {
      title: "Ay",
      short: "Duygusal tarafın — kendini güvende ve rahat hissetmek için neye ihtiyaç duyduğun.",
      what:
        "Güneş olmaya çalıştığın kişiyse, Ay kimse bakmıyorken zaten olduğun kişidir: ruh hâllerin, içgüdülerin, alışkanlıkların ve konfor alanın.",
      how:
        "Ay haritadaki en hızlı gökcismidir. Her 2-3 günde bir burç değiştirir; bu yüzden bazı doğum tarihlerinde hangi burçta olduğunu yalnızca saat söyleyebilir.",
      life:
        "Nasıl tepki verdiğini, seni neyin sakinleştirdiğini ve yakınlarından neye ihtiyaç duyduğunu anlatır. Günlük gökyüzünde de ana ruh hâlini belirleyen odur — bugün hangi burçta olduğu herkesin hissine renk verir.",
      example:
        "Boğa'da Ay rutinde ve bedensel konforda huzur bulur. İkizler'de Ay ise konuşarak, paylaşarak rahatlar.",
    },
    rising: {
      title: "Yükselen burç (Ascendant)",
      short: "Doğduğun anda doğu ufkunda yükselen burç — senin \"ön kapın\".",
      what:
        "Ascendant da denir (çarkta AC ya da ASC). Doğduğun anda doğu ufkunun zodyağı kestiği noktadır ve tüm haritanın başlangıç çizgisidir.",
      how:
        "Dünya döndüğü için her burç günde bir kez ufuktan yükselir — kabaca her iki saatte bir burç. Bu yüzden kesin doğum saati ve yeri gerekir. Ayrıca 1. evin nerede başlayacağını, dolayısıyla on iki evin tamamını o belirler.",
      life:
        "Tarzın, ilk izlenimin, bir odaya girişin ve yeni şeylere başlama biçimindir. İnsanlar çoğu zaman birinin Güneş'inden önce Yükselen'ini fark eder.",
      example:
        "Başak Güneş ve Yay Yükselen biri, titiz tarafı ortaya çıkmadan önce açık ve maceracı biri gibi görünebilir.",
    },
    planet: {
      title: "Gezegenler",
      short: "Haritanın oyuncuları — her biri senin farklı bir yanını temsil eder.",
      what:
        "Astrolojide \"gezegen\" Güneş ve Ay'ı da kapsar. Her biri bir dürtüdür: Merkür düşünür ve konuşur, Venüs sever ve değer verir, Mars harekete geçer ve ister, Jüpiter genişletir, Satürn yapı kurar, Uranüs sarsar, Neptün hayal eder, Plüton dönüştürür.",
      how:
        "Doğduğun andaki konumları astronomik olarak hesaplanır. İç ve hızlı gezegenler (Ay'dan Mars'a) kişisel tarzını anlatır; bir burçta yıllarca kalan yavaş dış gezegenler ise daha çok kuşağından söz eder — haritandaki hassas bir noktanın üstünde durmadıkları sürece.",
      life:
        "Gezegen senin hangi yanının devrede olduğunu söyler; burcu nasıl davrandığını; evi ise hayatın neresinde ortaya çıktığını.",
      example:
        "7. evde Akrep'te Venüs: yakın ilişkiler (7. ev) üzerinden ifade edilen, derin ve yoğun (Akrep) bir sevgi (Venüs).",
    },
    sign: {
      title: "Burçlar",
      short: "Bir gezegenin davranabileceği on iki tarz — işin \"nasıl\" kısmı.",
      what:
        "Zodyak, Güneş'in, Ay'ın ve gezegenlerin üzerinde ilerlediği gökyüzü kuşağıdır; 30°'lik on iki eşit dilime bölünür: Koç'tan Balık'a. Bir burçtaki gezegen o burcun tarzına bürünür.",
      how:
        "Her burcun bir elementi (ateş, toprak, hava, su) ve bir niteliği (başlatan, sabit, uyum sağlayan) vardır. Ateş coşkulu, toprak pratik, hava zihinsel, su duygusaldır — bu ikili her burca karakterini verir.",
      life:
        "Burçlar kendi başlarına hareket etmez; içlerindeki gezegenlere renk verir. \"Ben Akrep'im\" demek hikâyenin yalnızca on ikide biridir.",
      example:
        "Terazi'de Mars (itici güç) diplomatik davranır; Koç'ta Mars ise hemen harekete geçer.",
    },
    house: {
      title: "Evler",
      short: "Hayatın on iki alanı — haritandaki \"nerede\" sorusunun cevabı.",
      what:
        "Harita çarkı ev adı verilen on iki dilime ayrılır. Her biri hayatın bir alanıdır: benlik (1.), para (2.), iletişim (3.), yuva (4.), yaratıcılık ve aşk (5.), günlük iş ve sağlık (6.), ortaklar (7.), paylaşılan kaynaklar ve yakınlık (8.), inançlar ve yolculuk (9.), kariyer (10.), arkadaşlar (11.), dinlenme ve iç dünya (12.).",
      how:
        "Evler doğum saatin ve yerinle sabitlenir: 1. ev Yükselen'inden başlar ve saat yönünün tersine devam eder. Her evin başlangıç kenarında (kuspunda) bir burç ve o burca bağlı bir \"yönetici\" gezegen vardır; bu gezegen evin hikâyesini haritanın başka bir yerine taşır.",
      life:
        "Gezegenlerle dolu bir ev, hayatının hareketli bir alanıdır. Boş bir ev hayatında eksik bir alan anlamına gelmez — sadece daha sessiz işler; nasıl işlediğini yöneticisi söyler.",
      example:
        "10. evde Güneş: kimliği kariyere ve topluma açık hayata bağlı biri. 4. evde Ay: yuvaya ve aileye derin bağlılık.",
    },
    aspect: {
      title: "Açılar",
      short: "Gezegenler arasındaki açılar — iki yanının birbiriyle nasıl anlaştığı.",
      what:
        "İki gezegen daire üzerinde belirli uzaklıklarda durduğunda birbiriyle \"konuşur\". Bu konuşmalara açı denir ve çarkın içinde çizgi olarak gösterilir.",
      how:
        "Başlıcaları: kavuşum (0°, iç içe), sekstil (60°, bir fırsat), kare (90°, harekete iten sürtünme), üçgen (120°, kolay akış), karşıt (180°, iki uç arasında çekişme). Çarktaki yeşilimsi çizgiler kolay, gül rengi çizgiler gergin açılardır.",
      life:
        "Kolay açılar, farkında bile olmadığın yeteneklerdir. Gergin açılar büyüdüğün yerlerdir — baskı yaratırlar ama motivasyon da verirler. Hiçbiri tek başına iyi ya da kötü değildir.",
      example:
        "Ay kare Mars: duygular hızla eyleme dönüşür. Venüs üçgen Jüpiter: sıcaklık ve cömertlik doğal gelir.",
    },
    orb: {
      title: "Orb (güç)",
      short: "Bir açının tam açıya ne kadar yakın olduğu — ne kadar yakınsa o kadar güçlü.",
      what:
        "Gezegenler nadiren tam 90° ya da 120° mesafede durur. Orb, tam açıdan kaç derece saptıklarıdır. Uygulama bunu bir kelimeyle gösterir: Tam, Güçlü, Belirgin ya da Hafif.",
      how:
        "1°'nin altı tam, yaklaşık 3°'ye kadar güçlü, yaklaşık 6°'ye kadar belirgin, daha genişi hafif sayılır. Güneş ve Ay en önemli gökcisimleri olduğu için onlara biraz daha geniş orb tanınır.",
      life:
        "Sıkı bir açı sürekli hissettiğin bir şeydir; geniş bir açı daha çok arka plandaki bir tondur. Günlük transitlerde orb daralıyorsa etki güçleniyor, genişliyorsa azalıyor demektir.",
      example:
        "0,4°'lik bir Güneş kare Satürn haritayı tanımlayan bir gerilimdir; 7°'de ise neredeyse hissedilmez.",
    },
    transit: {
      title: "Transitler",
      short: "Gezegenlerin bugün nerede olduğu ve bunun doğum haritana nasıl dokunduğu.",
      what:
        "Doğum haritan donmuş bir andır ama gökyüzü hareket etmeye devam eder. Transit, şu anki bir gezegenin doğum haritandaki bir gezegene ya da noktaya açı yapmasıdır. Astroloji zamanlamayı bununla konuşur.",
      how:
        "Bugünkü gezegen konumları haritanla karşılaştırılır. Hareket eden bir gezegen seninkilerden birine anlamlı bir açı yaptığında bu bir transittir. Hızlı gezegenler (Ay, Merkür, Venüs) bir gün ya da bir hafta süren ruh hâlleri; yavaş olanlar (Satürn, Plüton) aylarca süren dönemler yaratır.",
      life:
        "Transitler bir şeyleri olmaya zorlamaz; içinden geçtiğin havayı anlatır — ne zaman ilerlemek, dinlenmek, konuşmak ya da beklemek için iyi bir an olduğunu. Bugün sekmesi onları canlı gösterir; Gelecek sekmesindeki öngörü de bunlardan oluşur.",
      example:
        "Jüpiter'in Güneş'inin üzerinden geçmesi: özgüven ve fırsat dönemi. Satürn'ün Ay'ına kare yapması: sabır isteyen daha ağır bir dönem.",
    },
    retrograde: {
      title: "Retro (℞)",
      short: "Bir gezegenin gökyüzünde geri gidiyormuş gibi görünmesi.",
      what:
        "Hiçbir gezegen gerçekten geri dönmez. Dünya ve gezegenler farklı hızlarda döndüğü için bir gezegen bir süre yıldızların önünde geriye kayıyormuş gibi görünür — yolda geçtiğin daha yavaş bir arabanın geri gidiyormuş gibi görünmesi gibi.",
      how:
        "Merkür bunu yılda üç-dört kez, yaklaşık üç hafta boyunca yapar; Venüs ve Mars daha seyrek; dış gezegenler ise her yıl aylarca. Uygulama bunu ℞ ile işaretler.",
      life:
        "Astroloji retroyu \"yeniden\" zamanı olarak okur: gözden geçirmek, geri dönmek, onarmak, yeniden düşünmek. Doğum haritasında ise enerjisini daha içe dönük ya da kendine özgü biçimde kullanan bir gezegene işaret eder.",
      example:
        "Merkür retrosu, yeni işlere başlamaktan çok mesajları ve planları iki kez kontrol etmenin klasik zamanıdır.",
    },
    midheaven: {
      title: "Tepe noktası (kariyer noktası)",
      short: "Haritanın en yüksek noktası — topluma dönük yönün ve çağrın.",
      what:
        "Tepe noktası (MC), Güneş'in öğle vakti bulunacağı yerdir: haritanın zirvesi. 10. evin başlangıcını işaret eder.",
      how:
        "Yükselen gibi kesin doğum saatine ve yerine bağlıdır; ikisi her zaman yaklaşık çeyrek daire arayla durur.",
      life:
        "İtibarını, kariyer yönünü ve ne ile tanınmak istediğini anlatır — iş unvanını değil, bırakmak istediğin izin türünü.",
      example:
        "Kova'da tepe noktası: özgünlük, teknoloji ya da birçok insana dokunan davalar aracılığıyla tanınmak.",
    },
    northNode: {
      title: "Ay düğümleri",
      short: "Nereye doğru büyüdüğünü (Kuzey) ve neyin sana kolay geldiğini (Güney) gösteren iki nokta.",
      what:
        "Düğümler gezegen değildir; Ay'ın yörüngesinin Güneş'in yolunu kestiği iki noktadır. Her zaman tam karşı karşıya dururlar.",
      how:
        "Zodyakta yavaşça geriye doğru ilerler, her burçta yaklaşık 18 ay kalırlar. Kuzey Düğüm'ün burcu ve evi bir yönü; tam karşısındaki Güney Düğüm ise tanıdık bir zemini anlatır.",
      life:
        "Güney Düğüm konfor alanındır — yaslandığın beceriler. Kuzey Düğüm ise yabancı ama doyurucu hissettiren yöndür. Büyüme genelde, sahip olduklarını bırakmadan ona doğru ilerlediğinde gerçekleşir.",
      example:
        "Terazi'de Kuzey, Koç'ta Güney Düğüm: her şeyi tek başına yapma alışkanlığından sonra ortaklığı ve uzlaşmayı öğrenmek.",
    },
    saturnReturn: {
      title: "Satürn dönüşü",
      short: "Satürn'ün doğduğundaki yerine geri dönmesi — yaklaşık 29, 58 ve 87 yaşlarında.",
      what:
        "Satürn zodyağın tamamını yaklaşık 29,5 yılda dolaşır. Doğum konumuna geri döndüğünde astroloji bunu hayatın büyük bir kontrol noktası olarak görür.",
      how:
        "Uygulama, Satürn'ün haritandaki derecesine tam olarak ne zaman ulaştığını hesaplar. Etkisi genellikle bu tarihin çevresinde bir-iki yıl hissedilir.",
      life:
        "Olgunluk sınavlarıyla bilinir: sağlam temele oturmayan şeyler — kariyer, ilişki, yaşanan yer — sorgulanır, gerçek olanlar güçlenir. Pek çok insan sonradan bunu \"gerçekten yetişkin olduğum an\" diye anlatır.",
      example:
        "28-30 yaş civarında kariyer değiştirmek, bir ilişkide kalıcı adım atmak ya da şehir değiştirmek sıklıkla ilk Satürn dönüşüyle ilişkilendirilir.",
    },
    dayNightChart: {
      title: "Gündüz ya da gece haritası",
      short: "Doğduğunda Güneş'in ufkun üstünde mi altında mı olduğu.",
      what:
        "Geleneksel astroloji haritaları gündüz ve gece doğumları olarak ayırır (buna \"sekt\" denir). Görmesi kolaydır: Güneş çarkın üst yarısındaysa gündüz haritasıdır.",
      how:
        "Güneş'in Yükselen'e göre konumuna bağlıdır; bu yüzden doğum saati gerekir.",
      life:
        "Gündüz haritasında Güneş, Jüpiter ve Satürn daha yapıcı çalışır; gece haritasında ise Ay, Venüs ve Mars. Hangi gezegenlerin doğal yardımcıların olduğunu incelikle değiştirir.",
      example:
        "Gece haritasında zor bir Satürn konumu daha ağır okunur; Venüs ve Ay ise daha fazla destek verir.",
    },
    solarReturn: {
      title: "Solar return (doğum günü haritan)",
      short: "Güneş'in her yıl doğum konumuna döndüğü anın haritası — doğum gününden doğum gününe bir yıllık öngörü.",
      what:
        "Her yıl doğum gününde ya da ona çok yakın bir günde Güneş, doğduğun andaki derecesine tam olarak geri döner. O an için çıkarılan harita senin solar return haritandır; astrologlar onu önündeki yılın teması olarak okur.",
      how:
        "Uygulama solar return'ünün kesin dakikasını bulur (doğum gününden bir gün önce ya da sonra olabilir) ve o an için eksiksiz bir harita çıkarır. Bu haritanın Yükselen'i, Güneş'in hangi eve düştüğü ve en kalabalık evler yılın odağını anlatır. Ardından doğum haritanla karşılaştırılır.",
      life:
        "Yılın ağırlığının nereye düştüğünü — kariyer, ilişkiler, yuva, sağlık —, nasıl görüneceğini ve hangi ayların en çok değişim taşıdığını söyler. Her doğum gününde yenilenir.",
      example:
        "Güneş'in 7. eve düştüğü bir solar return, ilişkiler etrafında dönen bir yıla işaret eder — yeni bir ilişki, bir iş ortağı ya da mevcut bir bağı yeniden şekillendirmek.",
    },
    synastry: {
      title: "Sinastri (uyum)",
      short: "İki doğum haritasını karşılaştırıp iki insanın birbirini nasıl etkilediğine bakmak.",
      what:
        "Sinastri, bir kişinin haritasını diğerininkinin üzerine koyar ve aralarındaki açılara bakar: senin Venüs'ün onun Mars'ına, senin Ay'ın onun Güneş'ine ve böyle devam eder.",
      how:
        "Bir haritadaki her gezegen diğerindeki her gezegenle karşılaştırılır. Sıkı ve önemli temaslar (Güneş, Ay, Venüs, Mars, Yükselen) en çok ağırlık taşır. Uygulama bunları çekim, iletişim ve bağlılık gibi boyutlara ayırır.",
      life:
        "İki kişinin nerede doğal olarak anlaştığını ve nerede çaba gerekeceğini gösterir — partnerler için olduğu kadar arkadaşlar, aile ve iş arkadaşları için de. Buradaki gerilim bir hüküm değildir; ilişkinin anlayış istediği yerdir.",
      example:
        "Senin Ay'ın onun Güneş'ine üçgen: birbirinizden destek görürsünüz. Senin Mars'ın onun Merkür'üne kare: tartışmalar hızla büyüyebilir.",
    },
  },
};
