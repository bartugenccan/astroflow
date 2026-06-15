import { Injectable } from '@nestjs/common';

export interface ActionItem {
  type: string;
  title: string;
  description: string;
  urgency: string;
  frequencyBoost: number;
  durationMinutes: number;
  ritualType: string;
}

export interface DailyInsight {
  energyState: string;
  title: string;
  summary: string;
  actions: ActionItem[];
  ritualWindows: RitualWindow[];
  frequencyForecast: string;
}

export interface RitualWindow {
  start: string;
  ritualType: string;
  quality: string;
  description: string;
}

export interface TransitInput {
  planet: string;
  currentSign: string;
  aspect: string;
  natalPlanet: string;
  interpretation: string;
}

const ENERGY_STATES: Record<string, { state: string; title: string }> = {
  high_harmony: {
    state: 'HARMONY',
    title: 'Kozmik Akin Günü',
  },
  high_tension: {
    state: 'STRESS',
    title: 'Yildirim Dönüsüm Günü',
  },
  high_energy: {
    state: 'MOMENTUM',
    title: 'Mars Atesi Günü',
  },
  high_focus: {
    state: 'OVERLOAD',
    title: 'Satürn Disiplini Günü',
  },
  balanced: {
    state: 'HARMONY',
    title: 'Dengeli Frekans Günü',
  },
  creative: {
    state: 'MOMENTUM',
    title: 'Yaratici Iham Günü',
  },
};

const ACTION_TEMPLATES: Record<string, ActionItem[]> = {
  high_tension: [
    {
      type: 'fiziksel',
      title: 'Agirlik Antrenmani',
      description: 'Mars gerilimi kas gücüne kanalize et. 3 set temel hareketlerle basla ve her tekrarda nefesine odaklan.',
      urgency: 'high',
      frequencyBoost: 15,
      durationMinutes: 25,
      ritualType: 'KINETIC_SYNC',
    },
    {
      type: 'zihinsel',
      title: 'Gölge Günlügü',
      description: 'Seni rahatsiz eden düsünceleri hiç sansürsüz yaz. 7 dakika boyunca kalemini durdurma.',
      urgency: 'high',
      frequencyBoost: 10,
      durationMinutes: 7,
      ritualType: 'BREATHWORK',
    },
    {
      type: 'rituel',
      title: 'Topraklanma Meditasyonu',
      description: 'Çiplak ayakla topraga bas veya bir agaca dokun. 10 nefes boyunca köklerinin yere indigini hayal et.',
      urgency: 'medium',
      frequencyBoost: 12,
      durationMinutes: 15,
      ritualType: 'GROUNDING',
    },
    {
      type: 'sosyal',
      title: 'Sinir Çizme Pratigi',
      description: 'Bugün bir kisiye nazikçe hayir de. Sinir koymak öz sevginin en yüksek formudur.',
      urgency: 'medium',
      frequencyBoost: 8,
      durationMinutes: 5,
      ritualType: 'LIGHT_EXPOSURE',
    },
  ],
  high_harmony: [
    {
      type: 'yaratici',
      title: 'Ses Frekansi Çalismasi',
      description: '432 Hz veya 528 Hz frekansinda bir parça aç ve ses dalgalarinin bedeninde titreştigini hisset.',
      urgency: 'low',
      frequencyBoost: 20,
      durationMinutes: 20,
      ritualType: 'FREQUENCY_TUNING',
    },
    {
      type: 'sosyal',
      title: 'Minnettarlik Mesaji',
      description: 'Hayatinda önemli olan birine içten bir tesekkür mesaji gönder. Sadece 3 cümle yeter.',
      urgency: 'medium',
      frequencyBoost: 15,
      durationMinutes: 5,
      ritualType: 'LIGHT_EXPOSURE',
    },
    {
      type: 'rituel',
      title: 'Su Programlama',
      description: 'Bir bardak suya pozitif niyetini fisilda, sonra yudum yudum iç. Su hafizasini aktive et.',
      urgency: 'low',
      frequencyBoost: 18,
      durationMinutes: 10,
      ritualType: 'WATER_PROGRAMMING',
    },
    {
      type: 'yaratici',
      title: 'Serbest Akis Günlügü',
      description: 'Venüs enerjisiyle yaraticiligini serbest birak. Resim yap, siir yaz veya bir enstrüman çal.',
      urgency: 'low',
      frequencyBoost: 14,
      durationMinutes: 30,
      ritualType: 'FREQUENCY_TUNING',
    },
  ],
  high_energy: [
    {
      type: 'fiziksel',
      title: 'Yüksek Yogunluklu Aralik',
      description: '7 dakika boyunca maksimum efor ve dinlenme döngüleriyle Mars atesini yönlendir.',
      urgency: 'high',
      frequencyBoost: 18,
      durationMinutes: 7,
      ritualType: 'KINETIC_SYNC',
    },
    {
      type: 'fiziksel',
      title: 'Günes Selami Serisi',
      description: '5 tur Surya Namaskar yap. Her hareketi bir niyetle baglayarak akisi hisset.',
      urgency: 'medium',
      frequencyBoost: 14,
      durationMinutes: 12,
      ritualType: 'KINETIC_SYNC',
    },
    {
      type: 'zihinsel',
      title: 'Karar Protokolü',
      description: 'Erteledigin bir karari bugün al. 2 dakika düsün, sonra içgüdüne güven ve harekete geç.',
      urgency: 'high',
      frequencyBoost: 12,
      durationMinutes: 5,
      ritualType: 'BREATHWORK',
    },
    {
      type: 'yaratici',
      title: 'Fikir Fir Tinasi',
      description: 'Aklima gelen her fikri 5 dakika boyunca not al. Sansür yok, yargilama yok, sadece akiş var.',
      urgency: 'medium',
      frequencyBoost: 10,
      durationMinutes: 5,
      ritualType: 'FREQUENCY_TUNING',
    },
  ],
  high_focus: [
    {
      type: 'zihinsel',
      title: 'Derin Odak Blok',
      description: 'Tam 45 dakika boyunca telefonunu uçak moduna al ve sadece bir ise odaklan.',
      urgency: 'high',
      frequencyBoost: 16,
      durationMinutes: 45,
      ritualType: 'BREATHWORK',
    },
    {
      type: 'rituel',
      title: 'Satürn Nefes Protokolü',
      description: '4 saniye nefes al, 7 saniye tut, 8 saniye ver. Tam 10 döngü. Otonom sinir sistemini regüle eder.',
      urgency: 'medium',
      frequencyBoost: 13,
      durationMinutes: 8,
      ritualType: 'BREATHWORK',
    },
    {
      type: 'zihinsel',
      title: 'Dijital Detoks Penceresi',
      description: '2 saat boyunca tüm bildirimleri kapat. Sadece analog dünyayla etkilesim kur.',
      urgency: 'medium',
      frequencyBoost: 11,
      durationMinutes: 120,
      ritualType: 'LIGHT_EXPOSURE',
    },
    {
      type: 'rituel',
      title: 'Yapi Günlügü',
      description: 'Haftalik hedeflerini ve bugün atacagin somut adimlari listele. Kaosu düzene çevir.',
      urgency: 'low',
      frequencyBoost: 9,
      durationMinutes: 15,
      ritualType: 'GROUNDING',
    },
  ],
};

const RITUAL_DESCRIPTIONS: Record<string, string[]> = {
  'NEFES': [
    'Solunum ritminle bedenindeki elektromanyetik alani yeniden dengeliyorsun',
    'Her nefes döngüsünde sinir sistemin dogal frekansina dönüyor',
    'Burundan alinan 4 sayilik nefes, kalp atis hizini optimize eden en dogal biofeedback mekanizmasidir',
  ],
  'TOPRAKLANMA': [
    'Ayak tabanlarindan topraga akan elektronlar, vücudundaki serbest radikalleri nötralize ediyor',
    'Schumann rezonansi ile senkronize oluyorsun. Bu, Dünyanin dogal kalp atisidir',
    'Çiplak cildin toprakla bulustugunda, vücudunun voltaji sifirlanir ve inflamasyon azalir',
  ],
  'HAREKET': [
    'Fiziksel hareket, hucrelerindeki mitokondrileri aktive ederek frekansini yükseltiyor',
    'Kinestetik zeka ile beden-zihin baglantisi kuran en eski rituel formudur',
    'Her adiminda topraga biraktigin mekanik enerji, piezoelektrik etkiyle kristal yapilara dönüsür',
  ],
  'SU_PROGRAMLAMA': [
    'Masaru Emotonun kristal deneyleri, suyun bilinç tasidigini gösteriyor',
    'Içtigin suya fisildadigin niyet, moleküler hafiza yoluyla hücrelerine programlaniyor',
    'Su, evrendeki en güçlü çözücüdür. Fiziksel oldugu kadar ruhsal toksinleri de arindirir',
  ],
  'DALGALANMA': [
    'Ses dalgalariyla rezonansa giren her hücren, kendi dogal frekansini hatirliyor',
    'Kulak çinlamasi olarak bildigin fenomen, aslinda beyninin yüksek frekanslara uyum saglama çabasidir',
    '432 Hz frekansi, DNA molekülünün dogal titresim frekansi ile birebir örtüsür',
  ],
};

const PLANET_RITUAL_MAP: Record<string, string[]> = {
  'gunes': ['LIGHT_EXPOSURE', 'KINETIC_SYNC'],
  'ay': ['WATER_PROGRAMMING', 'BREATHWORK'],
  'merkur': ['BREATHWORK', 'FREQUENCY_TUNING'],
  'venus': ['WATER_PROGRAMMING', 'FREQUENCY_TUNING'],
  'mars': ['KINETIC_SYNC', 'GROUNDING'],
  'jupiter': ['LIGHT_EXPOSURE', 'BREATHWORK'],
  'saturn': ['GROUNDING', 'BREATHWORK'],
  'uranus': ['FREQUENCY_TUNING', 'KINETIC_SYNC'],
  'neptun': ['WATER_PROGRAMMING', 'FREQUENCY_TUNING'],
  'pluton': ['GROUNDING', 'BREATHWORK'],
};

@Injectable()
export class AIInsightEngine {

  generateDailyInsight(transits: TransitInput[], frequencyScore: number): DailyInsight {
    const scores = this.analyzeTransitScores(transits);
    const profile = this.determineProfile(scores);
    const energyInfo = ENERGY_STATES[profile] || ENERGY_STATES['balanced'];

    const actions = this.selectActions(profile);
    const personalizedActions = actions.map((a) =>
      this.personalizeActionDescription(a, transits),
    );

    const ritualWindows = this.calculateRitualWindows(transits);
    const summary = this.generateSummary(profile, transits, frequencyScore);
    const frequencyForecast = this.predictFrequencyChange(frequencyScore, scores);

    return {
      energyState: energyInfo.state,
      title: energyInfo.title,
      summary,
      actions: personalizedActions,
      ritualWindows,
      frequencyForecast,
    };
  }

  generateAffirmationRecommendation(
    transits: TransitInput[],
  ): { text: string; language: string; focusArea: string }[] {
    const affirmations: { text: string; language: string; focusArea: string }[] = [];
    const scores = this.analyzeTransitScores(transits);

    if (scores.tension > scores.harmony && scores.tension > 40) {
      affirmations.push(this.generateChallengeAffirmation(transits));
    }

    if (scores.harmony > scores.tension || scores.creativity > 50) {
      affirmations.push(this.generatePositiveAffirmation(transits));
    }

    if (scores.energy > 50) {
      affirmations.push({
        text: 'Bugün her adimim evrenin ritmiyle uyum içinde. Enerjim sinirsiz, niyetim saf.',
        language: 'tr',
        focusArea: 'motivasyon',
      });
    }

    if (scores.focus > 50) {
      affirmations.push({
        text: 'Zihnim bir elmas gibi berrak. Dikkatim lazer isini gibi keskin. Dogru seye, dogru zamanda odaklaniyorum.',
        language: 'tr',
        focusArea: 'odaklanma',
      });
    }

    if (affirmations.length === 0) {
      affirmations.push({
        text: 'Her an yeni bir baslangiçtir. Bugün kendimi oldugum gibi kabul ediyor ve sevgiyle kucakliyorum.',
        language: 'tr',
        focusArea: 'oz-sevgi',
      });
    }

    return affirmations;
  }

  translateTransitToAction(transit: TransitInput): string {
    const aspectActionMap: Record<string, Record<string, string>> = {
      'Kare': {
        'mars': 'Agirlik kaldir veya yüksek yogunluklu interval yap',
        'saturn': 'Erteledigin sorumlulugu simdi tamamla',
        'gunes': 'Önceliklerini yeniden sirala ve bir sinir koy',
        'ay': 'Duygularini fiziksel bir aktiviteyle bosalt',
        'merkur': 'Önemli bir konusmayi bugün yap, erteleme',
        'venus': 'Iliskinde dürüst bir sinir belirle',
        'jupiter': 'Abartmadan bir adim at, planini küçült',
        'uranus': 'Beklenmedik degisime direnme, içine ak',
        'neptun': 'Hayal ile gerçegi ayir, somut bir adim at',
        'pluton': 'Kontrol takintini birak, teslim ol',
      },
      'Karsit': {
        'mars': 'Rekabet yerine isbirligini seç',
        'saturn': 'Yapi kurmak için önce eskiyi sal',
        'gunes': 'Egonu bir kenara birak ve dinle',
        'ay': 'Iç dünyani disariya ifade et',
        'merkur': 'Karsi fikirlere açik ol, sentez yap',
        'venus': 'Vermek ve almak dengesini gözden geçir',
        'jupiter': 'Inancini sorgula, yeni perspektifler ara',
        'uranus': 'Özgürlük ihtiyacin ile sorumluluklarini dengele',
        'neptun': 'Gerçeklikten kopmadan hayal kur',
        'pluton': 'Güç savasindan çekil, dönüse izin ver',
      },
      'Kavusum': {
        'mars': 'Yeni bir fiziksel baslangiç yap',
        'saturn': 'Uzun vadeli bir planin temelini at',
        'gunes': 'Kendini ifade edecek bir platform yarat',
        'ay': 'Duygusal bir arinma ritüeli yap',
        'merkur': 'Ögrenecegin yeni bir konu seç ve basla',
        'venus': 'Kendine güzellik ve bakim zamani ayir',
        'jupiter': 'Büyük resmi gör ve ilk adimi at',
        'uranus': 'Alisilmadik bir sey dene, rutinini kir',
        'neptun': 'Meditasyonla yüksek benligine baglan',
        'pluton': 'Gölge yönlerinle yüzles, yaz veya çiz',
      },
      'Sekstil': {
        'mars': 'Enerjini yaratici bir projeye yönlendir',
        'saturn': 'Bugün küçük bir disiplin rutini olustur',
        'gunes': 'Yeteneklerini sergilemek için firsat kolla',
        'ay': 'Sezgilerine güven ve iç sesini dinle',
        'merkur': 'Bir arkadasinla derin bir sohbet et',
        'venus': 'Küçük bir estetik dokunusla ortamini güzellestir',
        'jupiter': 'Bilgini paylas, birine bir sey ögret',
        'uranus': 'Yeni bir teknoloji veya araç dene',
        'neptun': 'Sanatsal bir aktiviteye zaman ayir',
        'pluton': 'Bir aliskanligini dönüstürmeye basla',
      },
      'Ucgen': {
        'mars': 'Atletik performansini test et',
        'saturn': 'Uzun vadeli yatirim veya plan yap',
        'gunes': 'Sahneye çik, liderlik et',
        'ay': 'Aile büyüklerinle vakit geçir',
        'merkur': 'Yaz, konus, paylas; iletisim kanallarin açik',
        'venus': 'Ask ve yaraticilikla dolu bir aksami planla',
        'jupiter': 'Sansini zorlayacak bir adim at',
        'uranus': 'Inovasyon yap, ezber boz',
        'neptun': 'Ruhsal bir inzivaya çekil, ilham topla',
        'pluton': 'Derin bir psikolojik içgörü için günlük tut',
      },
      'Quintile': {
        'mars': 'Alisilmadik bir spor veya hareket dene',
        'saturn': 'Eski bir problemi yeni bir yöntemle çöz',
        'gunes': 'Sahne sanatlariyla kendini ifade et',
        'ay': 'Lüsid rüya pratigi yap',
        'merkur': 'Yeni bir dil veya kodlama dili ögrenmeye basla',
        'venus': 'Sira disi bir sanat eseri yarat',
        'jupiter': 'Seyahat plani yap, bilinmeyene açil',
        'uranus': 'Bir icat veya bulus için beyin firtinasi yap',
        'neptun': 'Bilinçalti keşfi için rehberli meditasyon dene',
        'pluton': 'Gölge çalismasi yap, bastirdiklarini ortaya çikar',
      },
      'Biquintile': {
        'mars': 'Bedensel farkindalik için Tai Chi veya Qi Gong dene',
        'saturn': 'Minimalizm denemesi yap, gereksizi birak',
        'gunes': 'Kisisel markani veya tarzini yeniden yarat',
        'ay': 'Rüya günlügü tutmaya basla',
        'merkur': 'Zihin haritasi çikar, baglantilari gör',
        'venus': 'Yasam alanini Feng Shui ile yeniden düzenle',
        'jupiter': 'Mentorluk al veya mentor ol',
        'uranus': 'Elektriksel grounding pratigi yap',
        'neptun': 'Müzikle trans hali çalismasi yap',
        'pluton': 'Kök aile dinamiklerini arastir ve yaz',
      },
    };

    const aspectActions = aspectActionMap[transit.aspect];
    if (aspectActions) {
      const natalAction = aspectActions[transit.natalPlanet];
      const planetAction = aspectActions[transit.planet];
      if (natalAction) return natalAction;
      if (planetAction) return planetAction;
    }

    const fallbackActions: Record<string, string> = {
      'Kare': 'Bu enerjiyi fiziksel harekete dönüstür',
      'Karsit': 'Dengeyi bulmak için karsi tarafi anlamaya çalis',
      'Kavusum': 'Bu birlestirici enerjiyle yeni bir sey baslat',
      'Sekstil': 'Bu firsat penceresinde küçük bir adim at',
      'Ucgen': 'Dogal yeteneklerini sergilemek için harekete geç',
      'Quintile': 'Yaratici ilhami yakala ve bir çikti üret',
      'Biquintile': 'Alisilmisin disinda bir yaklasim dene',
    };

    return fallbackActions[transit.aspect] || 'Iç sesini dinle ve sezgilerine güven';
  }

  private analyzeTransitScores(
    transits: TransitInput[],
  ): { harmony: number; tension: number; energy: number; focus: number; creativity: number } {
    let harmony = 0;
    let tension = 0;
    let energy = 0;
    let focus = 0;
    let creativity = 0;

    for (const t of transits) {
      switch (t.aspect) {
        case 'Ucgen':
          harmony += 25;
          energy += 10;
          break;
        case 'Sekstil':
          harmony += 15;
          energy += 8;
          creativity += 10;
          break;
        case 'Kare':
          tension += 20;
          energy += 15;
          focus += 12;
          break;
        case 'Karsit':
          tension += 25;
          energy += 12;
          focus += 10;
          break;
        case 'Kavusum':
          energy += 20;
          focus += 15;
          creativity += 15;
          break;
        case 'Quintile':
        case 'Biquintile':
          creativity += 30;
          harmony += 10;
          break;
      }
    }

    harmony = Math.min(100, harmony);
    tension = Math.min(100, tension);
    energy = Math.min(100, energy);
    focus = Math.min(100, focus);
    creativity = Math.min(100, creativity);

    return { harmony, tension, energy, focus, creativity };
  }

  private determineProfile(
    scores: { harmony: number; tension: number; energy: number; focus: number; creativity: number },
  ): string {
    if (scores.creativity > 60) return 'creative';
    if (scores.tension > scores.harmony * 1.5 && scores.tension > 40) return 'high_tension';
    if (scores.harmony > scores.tension * 1.5 && scores.harmony > 40) return 'high_harmony';
    if (scores.energy > 60) return 'high_energy';
    if (scores.focus > 60) return 'high_focus';

    const max = Math.max(scores.harmony, scores.tension, scores.energy, scores.focus, scores.creativity);
    if (scores.energy === max) return 'high_energy';
    if (scores.focus === max) return 'high_focus';
    if (scores.tension === max) return 'high_tension';
    if (scores.harmony === max) return 'high_harmony';

    return 'balanced';
  }

  private selectActions(profile: string): ActionItem[] {
    const templates = ACTION_TEMPLATES[profile] || ACTION_TEMPLATES['high_harmony'];
    return templates.slice(0, 3);
  }

  private personalizeActionDescription(action: ActionItem, transits: TransitInput[]): ActionItem {
    if (transits.length === 0) return { ...action };

    const dominantTransit = transits.reduce((a, b) => {
      const aRank = ['Kare', 'Karsit', 'Kavusum', 'Ucgen', 'Sekstil', 'Quintile', 'Biquintile'].indexOf(a.aspect);
      const bRank = ['Kare', 'Karsit', 'Kavusum', 'Ucgen', 'Sekstil', 'Quintile', 'Biquintile'].indexOf(b.aspect);
      return aRank < bRank ? a : b;
    });

    const planetRituals = this.mapPlanetToRitual(dominantTransit.planet);
    const natalRituals = this.mapPlanetToRitual(dominantTransit.natalPlanet);
    const recommededRituals = [...new Set([...planetRituals, ...natalRituals])];

    if (recommededRituals.length > 0 && action.ritualType !== recommededRituals[0]) {
      const alternateAction = ACTION_TEMPLATES['high_harmony'].find(
        (a) => recommededRituals.includes(a.ritualType),
      );

      if (alternateAction && Math.random() < 0.3) {
        return {
          ...alternateAction,
          description: `${alternateAction.description} (${dominantTransit.planet} etkisiyle önerildi)`,
        };
      }
    }

    return { ...action };
  }

  private calculateRitualWindows(transits: TransitInput[]): RitualWindow[] {
    const windows: RitualWindow[] = [];
    const now = new Date();

    const morningStart = new Date(now);
    morningStart.setHours(6, 0, 0, 0);
    const morningEnd = new Date(now);
    morningEnd.setHours(9, 0, 0, 0);

    const noonStart = new Date(now);
    noonStart.setHours(12, 0, 0, 0);
    const noonEnd = new Date(now);
    noonEnd.setHours(14, 0, 0, 0);

    const eveningStart = new Date(now);
    eveningStart.setHours(20, 0, 0, 0);
    const eveningEnd = new Date(now);
    eveningEnd.setHours(23, 0, 0, 0);

    const activePlanets = transits.slice(0, 3);
    const allRitualTypes = activePlanets.flatMap((t) => {
      const planetRituals = this.mapPlanetToRitual(t.planet);
      return planetRituals;
    });
    const uniqueRituals = [...new Set(allRitualTypes)];

    const windowsConfig = [
      { start: morningStart, end: morningEnd, slot: 'sabah', ritualIndex: 0 },
      { start: noonStart, end: noonEnd, slot: 'ogle', ritualIndex: 1 },
      { start: eveningStart, end: eveningEnd, slot: 'aksam', ritualIndex: 2 },
    ];

    for (const config of windowsConfig) {
      const ritualType = uniqueRituals[config.ritualIndex % uniqueRituals.length] || 'BREATHWORK';
      const description = this.getRitualDescription(ritualType);

      const qualityMap: Record<string, string> = {
        'sabah': 'yuksek',
        'ogle': 'orta',
        'aksam': 'yuksek',
      };

      windows.push({
        start: config.start.toISOString(),
        ritualType,
        quality: qualityMap[config.slot] || 'orta',
        description,
      });
    }

    return windows;
  }

  private mapPlanetToRitual(planet: string): string[] {
    return PLANET_RITUAL_MAP[planet] || ['BREATHWORK', 'GROUNDING'];
  }

  private getRitualDescription(ritualType: string): string {
    const descriptions = RITUAL_DESCRIPTIONS[ritualType] || RITUAL_DESCRIPTIONS['NEFES'];
    const idx = Math.abs(this.hashString(ritualType)) % descriptions.length;
    return descriptions[idx];
  }

  private generateSummary(
    profile: string,
    transits: TransitInput[],
    frequencyScore: number,
  ): string {
    const scoreTier = frequencyScore >= 800 ? 'omega seviye' :
      frequencyScore >= 600 ? 'delta seviye' :
      frequencyScore >= 400 ? 'gamma seviye' :
      frequencyScore >= 200 ? 'beta seviye' : 'alfa seviye';

    const transitCount = transits.length;
    const transitIntensity = transitCount >= 5 ? 'yogun' : transitCount >= 3 ? 'hareketli' : 'sakin';

    const profileSummaries: Record<string, string> = {
      high_tension: `Kozmik enerjiler bugün gerilim yaratiyor. ${transitIntensity} bir transit günü seni bekliyor. Bu gerilimi bilinçli eyleme dönüstürmek, ${scoreTier} frekansina yükselebilmen için anahtar. Satürn'ün disiplini ve Mars'in cesaretiyle, bu enerjileri yapici bir çiktiya çevirebilirsin.`,
      high_harmony: `Gökyüzü bugün uyum içinde. ${transitIntensity} bir transit akisiyla destekleniyorsun. Yildizlar, ${scoreTier} frekansindaki potansiyelini en üst düzeye çikarman için sana nadir bir firsat sunuyor. Venüs ve Jüpiter'in olumlu etkilesimiyle, iliskilerde ve yaraticilikta siçrama yapabilirsin.`,
      high_energy: `Mars atesi bugün zirvede. ${transitIntensity} bir transit gününde, eyleme geçmek için mükemmel bir zaman. ${scoreTier} frekansindaki enerjinle, bekleyen projelerini tamamlayabilir ve yeni baslangiçlar yapabilirsin. Bu yüksek enerjiyi odakli aksiyona dönüstürmek önemli.`,
      high_focus: `Satürn disiplini bugün ön planda. ${transitIntensity} bir transitle, zihinsel berraklik ve odaklanma yetilerin yükselis gösteriyor. ${scoreTier} frekansinda, stratejik planlamalar yapmak ve uzun vadeli kararlar almak için ideal bir gün.`,
      creative: `Yaratici ilham perileri bugün seninle. ${transitIntensity} bir transit akisi, sanatsal ve yenilikçi enerjileri hayatina çekiyor. ${scoreTier} frekansindaki potansiyelin, Uranüs ve Neptün'ün yaratici etkileriyle birleserek sana özgün çiktilar üretme firsati veriyor.`,
      balanced: `Kozmik terazi bugün dengede. ${transitIntensity} bir transitle, rutinlerine ve günlük akisina odaklanabilirsin. ${scoreTier} frekansinda tutarli kalmak, büyük siçramalarin temelini olusturur. Küçük ama istikrarli adimlar bugünün anahtari.`,
    };

    return profileSummaries[profile] || profileSummaries['balanced'];
  }

  private predictFrequencyChange(
    currentScore: number,
    scores: { harmony: number; tension: number; energy: number; focus: number; creativity: number },
  ): string {
    const netPotential = scores.harmony * 1.2 - scores.tension * 0.8 + scores.energy * 0.5 + scores.creativity * 0.7;
    const boostPotential = Math.round(netPotential * 0.2);

    if (boostPotential > 30) {
      return `Yildizlar bugün ${boostPotential} puana kadar frekans yükselişi öngörüyor. Ritüellerini tamamladiginda bu potansiyeli gerçeklestirebilirsin.`;
    } else if (boostPotential > 10) {
      return `Bugün dengeli bir gün. ${boostPotential} puan seviyesinde bir frekans artisi mümkün. Tutarli ritüel pratiginle istikrarli kal.`;
    } else {
      return `Bugün frekans seviyende büyük dalgalanmalar beklenmiyor. Mevcut ${currentScore} puan seviyeni korumak ve küçük adimlarla ilerlemek için uygun bir gün.`;
    }
  }

  private generatePositiveAffirmation(
    transits: TransitInput[],
  ): { text: string; language: string; focusArea: string } {
    const planetNames = [...new Set(transits.map((t) => t.planet))];
    const harmoniousTransits = transits.filter((t) =>
      ['Ucgen', 'Sekstil'].includes(t.aspect),
    );

    const planetAffirmations: Record<string, string> = {
      'gunes': 'Ben isigimi dünyaya cesaretle yansitiyorum.',
      'ay': 'Duygularim benim rehberimdir, onlara güveniyorum.',
      'merkur': 'Düsüncelerim berrak ve iletisimim akici.',
      'venus': 'Sevgi ve bolluk hayatima dogal olarak akar.',
      'mars': 'Iradem güçlü ve adimlarim kararli.',
      'jupiter': 'Bolluk ve bilgelik her an bana dogru genisliyor.',
      'saturn': 'Disiplinim beni özgürlestiriyor, sinirlarim beni koruyor.',
      'uranus': 'Degisime açigim ve içgüdüsel bilgime güveniyorum.',
      'neptun': 'Yüksek benligimle baglantidayim, ilham her an elimde.',
      'pluton': 'Dönüsüm benim dogal halimdir, her krizde yeniden dogarim.',
    };

    const phrases: string[] = [];

    for (const planet of planetNames) {
      if (planetAffirmations[planet]) {
        phrases.push(planetAffirmations[planet]);
      }
    }

    if (harmoniousTransits.length > 0) {
      phrases.push('Bugün evren benim lehime çalisiyor.');
    }

    if (phrases.length < 2) {
      phrases.push('Her nefes aldigimda yeni bir baslangicin esigindeyim.');
      phrases.push('Kendi frekansimi yükselttikçe dünyayi da degistiriyorum.');
    }

    const text = phrases.slice(0, 3).join(' ');

    return {
      text,
      language: 'tr',
      focusArea: 'pozitif-onaylama',
    };
  }

  private generateChallengeAffirmation(
    transits: TransitInput[],
  ): { text: string; language: string; focusArea: string } {
    const tenseTransits = transits.filter((t) =>
      ['Kare', 'Karsit'].includes(t.aspect),
    );

    const challengePhrases = [
      'Zorluklar benim büyüme katalizörümdür.',
      'Her gerilim bir dönüsüm firsati tasir.',
      'Oldugum kisiyi seviyor, olacagim kisiye güveniyorum.',
      'Direnç gösterdigim yerde dersim saklidir.',
      'Korkularimla yüzlestigimde özgürlesiyorum.',
      'Her kriz bir yeniden dogusun habercisidir.',
      'Bugün kendime karsi sabirli ve sefkatliyim.',
    ];

    const specificPhrases: Record<string, string> = {
      'mars': 'Öfkemi bilinçli eyleme ve yapici çiktiya dönüstürüyorum.',
      'saturn': 'Sabir ve disiplinle her engeli asabilirim.',
      'gunes': 'Egomun ötesindeki benligim sonsuz ve bütündür.',
      'ay': 'Duygusal dalgalanmalara teslim olmuyor, gözlemliyorum.',
      'merkur': 'Zihinsel karmasayi berrakliga dönüstürüyorum.',
      'venus': 'Kendime olan sevgim, disaridan onay almaya ihtiyaç duymaz.',
      'jupiter': 'Abartidan uzak, ölçülü ve bilge adimlar atiyorum.',
      'uranus': 'Kaosun içindeki düzeni görebiliyorum.',
      'neptun': 'Gerçeklikten kopmadan hayal kurabiliyorum.',
      'pluton': 'Kontrol etme ihtiyacimi saliyor ve güveniyorum.',
    };

    const selectedPhrases: string[] = [];

    for (const transit of tenseTransits.slice(0, 2)) {
      const planetPhrase = specificPhrases[transit.planet];
      if (planetPhrase && !selectedPhrases.includes(planetPhrase)) {
        selectedPhrases.push(planetPhrase);
      }
    }

    if (selectedPhrases.length < 2) {
      const shuffled = [...challengePhrases].sort(() => Math.random() - 0.5);
      for (const phrase of shuffled) {
        if (!selectedPhrases.includes(phrase) && selectedPhrases.length < 3) {
          selectedPhrases.push(phrase);
        }
      }
    }

    const text = selectedPhrases.slice(0, 3).join(' ');

    return {
      text,
      language: 'tr',
      focusArea: 'meydan-okuma',
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}
