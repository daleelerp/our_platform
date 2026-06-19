"use client";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import Image from "next/image";
import founderImage from "../../public/Founder/Magdy Image.jpg";

export function AboutContent() {
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);

  const content = {
    en: {
      title: "About Daleel",
      subtitle: "Your complete guide to ERP career paths. Whether you're a student starting young, or a professional looking to switch careers - we're with you every step of the way. We help developers and technical professionals, and we also help people who want to work in Functional or Business roles.",

      story: {
        title: "Our Story",
        paragraphs: [
          "Daleel (دليل) means 'guide' in Arabic. We chose this name because that's exactly what we aim to be — your trusted guide through the complex world of Enterprise Resource Planning systems.",
          "We built this platform because of people's many questions. Every now and then someone asks: \"Where do I start?\", \"What should I learn?\", \"Which system suits me?\". We found that there's a huge problem: people don't know what to do or how to start, and they have so many questions.",
          "We decided to build this platform to answer all their questions. Whether you're a student starting young, a professional looking to switch careers, or someone wanting to learn something new - we're with you every step of the way.",
          "We're not another course platform — we're curators. We gather deep, comprehensive data from thousands of sources online and carefully review it. We organize the best resources into clear learning paths, and guide you from where you are to where you want to be."
        ]
      },

      mission: {
        title: "Our Mission",
        text: "To democratize ERP education in MENA for everyone - students who want to start young, professionals looking to switch careers. We help developers and technical professionals, and we also help people who want to work in Functional or Business roles. We provide structured, bilingual learning paths with deep, comprehensive data gathered from thousands of sources and carefully reviewed."
      },
      vision: {
        title: "Our Vision",
        text: "To become the largest and most trusted platform that guides students across all fields and career paths in the MENA region, not only technical domains."
      },
      founderMessage: {
        title: "Founder's Message",
        subtitle: "Why we started Daleel",
        paragraphs: [
          "👋 I built this platform because of people's many questions. Every now and then someone asks: \"Where do I start?\", \"What should I learn?\", \"Which system suits me?\". I found that there's a huge problem: people don't know what to do or how to start, and they have so many questions.",
          "🎯 I decided to build this platform to answer all their questions - whether they're students starting young, or professionals looking to switch careers.",
          "😵 As professionals in the MENA region, we've all experienced the frustration of trying to learn ERP systems. You open YouTube and find thousands of videos. You search Google and get forum posts from 2015. You ask colleagues and get five different opinions on where to start.",
          "🧭 Daleel (دليل — meaning \"guide\" in Arabic) was born from this frustration. We're not creating another course platform. The internet already has enough content. What's missing is clarity — a guide that tells you exactly what to learn, in what order, using the best resources available. All from deep, comprehensive data gathered from thousands of sources online and carefully reviewed.",
          "🚀 We're starting with Oracle Cloud ERP because it's the most in-demand system in the Gulf region. But we're building this with you — the community will decide which ERP systems we add next.",
          "💚 This is an early-stage startup. We're honest about that. But we're serious about the mission: making ERP learning accessible, structured, and career-focused for everyone - students who want to start young, professionals looking to switch careers. We help developers and technical professionals, and we also help people who want to work in Functional or Business roles.",
          "👤 Daleel is currently a one-person team - but very soon, we'll be a full team",
          "🌍 Building from the MENA region, for the MENA region"
        ]
      },
      problemSolution: {
        problemTitle: "The Problem",
        solutionTitle: "Our Solution",
        problems: [
          "Lost and don't know where to start with enterprise systems",
          "20 browser tabs of scattered tutorials and documentation",
          "Outdated forum posts and technical guides from 2003",
          "YouTube rabbit holes with no clear path - overwhelming for beginners",
          "Expensive courses that don't match MENA market needs or technical requirements",
          "Places that take too many unnecessary flows and take a long time to learn without learning adequately"
        ],
        solutions: [
          "We help you choose the right career path and system - starting with Oracle ERP, expanding to SAP, Dynamics, Salesforce & more",
          "Complete guide to all career paths - salary and company insights from deep, comprehensive data",
          "We help with employment - full community and we recommend the best people to companies",
          "Exams and articles at very affordable prices - suitable for students and those starting young",
          "Clear paths curated by experts - data gathered from thousands of sources and carefully reviewed - bilingual support (Arabic/English)"
        ]
      },

      whatWeDo: {
        title: "What We Do",
        items: [
          {
            icon: "🗺️",
            title: "Curate Learning Paths",
            description: "We don't create courses. We gather deep, comprehensive data from thousands of sources online and carefully review it. We organize the best resources into clear, structured paths for each ERP module and career goal."
          },
          {
            icon: "🌍",
            title: "Focus on MENA",
            description: "Our paths are designed for the MENA job market. We understand the certifications, skills, and experience employers in our region are looking for."
          },
          {
            icon: "🔤",
            title: "Bilingual Support",
            description: "Learn in Arabic or English. We believe language shouldn't be a barrier to mastering enterprise software - perfect for students starting young."
          },
          {
            icon: "🤖",
            title: "AI-Powered Guidance",
            description: "Our AI understands your background and goals to recommend the perfect learning path for your career journey - whether you're a student or a professional looking to switch careers. We help developers and technical professionals, and we also help people who want to work in Functional or Business roles."
          }
        ]
      },

      whyDifferent: {
        title: "Why We're Different",
        comparison: [
          {
            others: "Scattered resources across 20+ platforms",
            daleel: "One organized path with the best resources - deep, comprehensive data gathered from thousands of sources"
          },
          {
            others: "Generic global content",
            daleel: "MENA-focused with regional job market insights - suitable for students and professionals looking to switch careers"
          },
          {
            others: "English-only documentation",
            daleel: "Full Arabic and English support - perfect for students starting young"
          },
          {
            others: "No career guidance",
            daleel: "Clear career outcomes and salary insights from deep, comprehensive data - we help with employment"
          }
        ]
      },

      values: {
        title: "Our Values",
        items: [
          {
            icon: "🎯",
            title: "Clarity Over Complexity",
            description: "We simplify the overwhelming into the achievable."
          },
          {
            icon: "🤝",
            title: "Honesty First",
            description: "We're transparent about what we offer and what we're still building."
          },
          {
            icon: "🌱",
            title: "Continuous Improvement",
            description: "We constantly update our paths based on market changes and user feedback."
          },
          {
            icon: "💡",
            title: "Community Driven",
            description: "We build with our users, not just for them."
          }
        ]
      },

      cta: {
        title: "Ready to Start Your Journey?",
        subtitle: "A structured system that helps ERP learners make the right career decisions and progress with confidence.",
        button: "Explore Plans"
      },

      contact: {
        title: "Get in Touch",
        email: "daleel.erp.site@gmail.com",
        text: "Have questions or feedback? We'd love to hear from you."
      }
    },
    ar: {
      title: "عن دليل",
      subtitle: "دليلك الكامل للمسارات المهنية في ERP. سواء كنت طالب عاوز تبدأ من سن صغير، أو محترف عاوز تغير مجالك - احنا معاك في كل خطوة. نساعد المبرمجين والتقنيين، ونساعد كمان الناس اللي هتشتغل Functional أو Business.",

      story: {
        title: "قصتنا",
        paragraphs: [
          "دليل — اخترنا الاسم ده لأنه يعكس هدفنا بالضبط: نبقى مرشدك الموثوق في عالم أنظمة ERP المعقد.",
          "عملنا المنصة دي بسبب أسئلة الناس الكتيرة. كل شوية حد بيسأل: \"أبدأ منين؟\"، \"أتعلم إيه؟\"، \"أيه النظام اللي يناسبني؟\". لقينا إن في مشكلة كبيرة جداً: الناس مش عارفة تعمل إيه أو تبدأ إزاي، وعندهم أسئلة كتيرة أوي.",
          "قررنا نعمل المنصة دي علشان تجاوب على كل أسئلتهم. سواء كنت طالب عاوز تبدأ من سن صغير، أو محترف عاوز يغير مجاله، أو حد عاوز يتعلم حاجة جديدة - احنا هنكون معاك في كل خطوة.",
          "احنا مش منصة دورات تانية — احنا منسقين. بنجمع داتا عميقة من آلاف المصادر على الإنترنت وبنراجعها بدقة. بننظم أحسن الموارد في مسارات تعلم واضحة، وبنرشدك من حيث أنت إلى حيث عاوز توصل."
        ]
      },

      mission: {
        title: "مهمتنا",
        text: "إتاحة تعليم ERP في الشرق الأوسط لكل الناس - الطلبة اللي عاوزين يبدأوا من سن صغير، والمحترفين اللي عاوزين يغيروا مجالاتهم. نساعد المبرمجين والتقنيين، ونساعد كمان الناس اللي هتشتغل Functional أو Business. بنوفر مسارات تعلم منظمة وثنائية اللغة بداتا عميقة متجمعة من آلاف المصادر ومتراجعة بدقة."
      },
      vision: {
        title: "رؤيتنا",
        text: "أن نكون أكبر منصة وأكثرها ثقة في توجيه الطلبة في جميع المجالات والمسارات المهنية في الشرق الأوسط، وليس المجالات التقنية فقط."
      },
      founderMessage: {
        title: "رسالة المؤسس",
        subtitle: "ليه بدأنا دليل",
        paragraphs: [
          "👋 عملت المنصة دي بسبب أسئلة الناس الكتيرة. كل شوية حد بيسأل: \"أبدأ منين؟\"، \"أتعلم إيه؟\"، \"أيه النظام اللي يناسبني؟\". لقيت إن في مشكلة كبيرة جداً: الناس مش عارفة تعمل إيه أو تبدأ إزاي، وعندهم أسئلة كتيرة أوي.",
          "🎯 قررت أعمل المنصة دي علشان تجاوب على كل أسئلتهم - سواء كانوا طلبة عاوزين يبدأوا من سن صغير، أو محترفين عاوزين يغيروا مجالاتهم.",
          "😵 كمحترفين في منطقة الشرق الأوسط، جربنا كلنا إحباط محاولة تعلم أنظمة ERP. تفتح يوتيوب وتلاقي آلاف الفيديوهات. تبحث في جوجل وتحصل على منشورات منتديات من 2015. تسأل الزملاء وتحصل على خمس آراء مختلفة عن منين تبدأ.",
          "🧭 دليل (Daleel — يعني \"مرشد\" بالعربي) اتولد من الإحباط ده. احنا مش هنعمل منصة دورات تانية. الإنترنت عنده محتوى كافي. اللي ناقص هو الوضوح — مرشد يقولك بالظبط إيه اللي تتعلمه، بأي ترتيب، باستخدام أحسن الموارد المتاحة. كل ده من داتا عميقة متجمعة من آلاف المصادر على الإنترنت ومتراجعة بدقة.",
          "🚀 بنبدأ بـ Oracle Cloud ERP عشان هو النظام الأكتر طلباً في منطقة الخليج. بس احنا بنبني ده معاكو — المجتمع هيقرر إيه أنظمة ERP اللي هنضيفها بعد كده.",
          "💚 دي شركة ناشئة في مراحلها الأولى. احنا صادقين في كده. بس احنا جادين في المهمة: نخلي تعلم ERP متاح ومنظم ومركز على المهنة لكل الناس - الطلبة اللي عاوزين يبدأوا من سن صغير، والمحترفين اللي عاوزين يغيروا مجالاتهم. نساعد المبرمجين والتقنيين، ونساعد كمان الناس اللي هتشتغل Functional أو Business.",
          "👤 دليل مكون من شخص واحد حاليا - قريبا جدا هنكون فريق كامل ان شاء الله",
          "🌍 نبني من الشرق الأوسط، للشرق الأوسط"
        ]
      },
      problemSolution: {
        problemTitle: "المشكلة",
        solutionTitle: "حلنا",
        problems: [
          "التوهان وعدم معرفة الطريق في أنظمة المؤسسات",
          "20 تبويب من الدروس والوثائق المتفرقة",
          "منشورات منتديات وأدلة تقنية قديمة من 2003",
          "فيديوهات يوتيوب بلا مسار واضح - مربكة للمبتدئين",
          "دورات غالية مش مناسبة لسوق الشرق الأوسط أو المتطلبات التقنية",
          "في أماكن بتاخد فلوووس كتير جداً على الفاضي وبياخدوا وقت طويل علشان تتعلم ومش بتتعلم بالشكل الكافي"
        ],
        solutions: [
          "نساعدك تختار المسار المهني والنظام المناسب ليك - بنبدأ بـ Oracle ERP، وهنتوسع لـ SAP، Dynamics، Salesforce والمزيد",
          "دليل لكل المسارات المهنية - بنعرفك المرتبات والشركات بداتا عميقة وشاملة",
          "نساعدك في التوظيف - كوميونيتي كامل ونرشح أحسن الناس للشركات",
          "امتحانات ومقالات بأسعار بسيطة جداً - مناسبة للطلبة واللي عاوز يبدأ من سن صغير",
          "مسارات واضحة منسقة من الخبراء - داتا متجمعة من آلاف المصادر ومتراجعة بدقة - دعم ثنائي اللغة (عربي/إنجليزي)"
        ]
      },

      whatWeDo: {
        title: "احنا بنعمل إيه",
        items: [
          {
            icon: "🗺️",
            title: "بننسق مسارات التعلم",
            description: "احنا مش بنعمل دورات. بنجمع داتا عميقة من آلاف المصادر على الإنترنت وبنراجعها بدقة. بننظم أحسن الموارد في مسارات واضحة ومنظمة لكل وحدة ERP وهدف مهني."
          },
          {
            icon: "🌍",
            title: "بنركز على الشرق الأوسط",
            description: "مساراتنا مصممة لسوق الشغل في الشرق الأوسط. بنفهم الشهادات والمهارات والخبرات اللي أصحاب الشغل في منطقتنا بيدوروا عليها."
          },
          {
            icon: "🔤",
            title: "دعم ثنائي اللغة",
            description: "اتعلم بالعربي أو الإنجليزي. احنا مؤمنين إن اللغة مش لازم تكون عائق قدام إتقان برامج المؤسسات."
          },
          {
            icon: "🤖",
            title: "إرشاد بالذكاء الاصطناعي",
            description: "ذكاؤنا الاصطناعي بيفهم خلفيتك وأهدافك ويوصيك بمسار التعلم المثالي لرحلتك المهنية - سواء كنت طالب أو محترف عاوز يغير مجاله. نساعد المبرمجين والتقنيين، ونساعد كمان الناس اللي هتشتغل Functional أو Business."
          }
        ]
      },

      whyDifferent: {
        title: "ليه احنا مختلفين",
        comparison: [
          {
            others: "موارد مبعثرة على 20+ منصة",
            daleel: "مسار واحد منظم مع أحسن الموارد - داتا عميقة متجمعة من آلاف المصادر"
          },
          {
            others: "محتوى عالمي عام",
            daleel: "تركيز على الشرق الأوسط مع رؤى سوق الشغل الإقليمي - مناسب للطلبة والمحترفين اللي عاوزين يغيروا مجالاتهم"
          },
          {
            others: "توثيق بالإنجليزي بس",
            daleel: "دعم كامل بالعربي والإنجليزي - مناسب للطلبة اللي عاوزين يبدأوا من سن صغير"
          },
          {
            others: "مفيش إرشاد مهني",
            daleel: "نتائج مهنية واضحة ورؤى عن الرواتب بداتا عميقة - بنساعدك في التوظيف"
          }
        ]
      },

      values: {
        title: "قيمنا",
        items: [
          {
            icon: "🎯",
            title: "الوضوح فوق التعقيد",
            description: "نبسط المعقد إلى قابل للتحقيق."
          },
          {
            icon: "🤝",
            title: "الصدق أولاً",
            description: "نحن شفافون بشأن ما نقدمه وما نزال نبنيه."
          },
          {
            icon: "🌱",
            title: "التحسين المستمر",
            description: "نحدث مساراتنا باستمرار بناءً على تغيرات السوق وملاحظات المستخدمين."
          },
          {
            icon: "💡",
            title: "مدفوعون بالمجتمع",
            description: "نبني مع مستخدمينا، وليس فقط من أجلهم."
          }
        ]
      },

      cta: {
        title: "مستعد لبدء رحلتك؟",
        subtitle: "نظام منظم يساعد متعلمي ERP على اتخاذ قرارات مهنية صحيحة والتقدم بثقة.",
        button: "استكشف الخطط"
      },

      contact: {
        title: "تواصل معنا",
        email: "daleel.erp.site@gmail.com",
        text: "لديك أسئلة أو ملاحظات؟ يسعدنا أن نسمع منك."
      }
    }
  };

  const t = language === "ar" ? content.ar : content.en;

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-10 w-48 bg-slate-200 rounded mb-4" />
            <div className="h-6 w-96 bg-slate-200 rounded" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#285c46] via-[#357a5d] to-[#429874] text-white py-20">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-emerald-200/20 blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/30 text-sm font-medium mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-200" />
                {language === "ar" ? "منصة دليل" : "Daleel Platform"}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">{t.title}</h1>
              <p className="text-lg md:text-xl text-emerald-100 leading-relaxed">{t.subtitle}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-sm">
                  {language === "ar" ? "ERP + Software" : "ERP + Software"}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-sm">
                  {language === "ar" ? "دعم عربي / English" : "Arabic / English"}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-sm">
                  {language === "ar" ? "تركيز الشرق الأوسط" : "MENA Focus"}
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-3xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold mb-4">
                {language === "ar" ? "لماذا دليل؟" : "Why Daleel?"}
              </h3>
              <div className="space-y-3 text-sm text-emerald-50">
                <div className="flex items-start gap-2">
                  <span>✅</span>
                  <span>
                    {language === "ar"
                      ? "بدل التشتت بين مصادر كثيرة، تاخد مسار واضح خطوة بخطوة."
                      : "Replace scattered learning with one clear step-by-step path."}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span>✅</span>
                  <span>
                    {language === "ar"
                      ? "محتوى مناسب لسوق العمل في الشرق الأوسط."
                      : "Content aligned with real MENA market needs."}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span>✅</span>
                  <span>
                    {language === "ar"
                      ? "اختيارات مهنية أوضح للطلبة والمحترفين."
                      : "Clearer career decisions for students and professionals."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">{t.story.title}</h2>
            <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
              {t.story.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">👁️ {t.vision.title}</h2>
              <p className="text-slate-600 leading-relaxed">{t.vision.text}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">🎯 {t.mission.title}</h2>
              <p className="text-slate-600 leading-relaxed">{t.mission.text}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Message */}
      <section className="py-16 bg-gradient-to-br from-slate-50 via-white to-[#f0f9f6]/40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-[#f0f9f6]/40 p-8 md:p-10">
            <div className="flex items-start gap-4 mb-6">
              <Image
                src={founderImage}
                alt="Founder"
                width={64}
                height={64}
                className="rounded-full w-16 h-16 object-cover border-2 border-white shadow"
              />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t.founderMessage.title}</h2>
                <p className="text-slate-500">{t.founderMessage.subtitle}</p>
              </div>
            </div>
            <div className="space-y-3 text-slate-700 leading-relaxed">
              {t.founderMessage.paragraphs.map((paragraph, i) => (
                <p key={i} className="bg-white/80 border border-slate-200 rounded-xl p-4 shadow-sm">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
              <h3 className="text-xl font-bold text-red-900 mb-4">😫 {t.problemSolution.problemTitle}</h3>
              <div className="space-y-3">
                {t.problemSolution.problems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-red-800 text-sm">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#f0f9f6] rounded-2xl border border-[#d4ede3] p-6">
              <h3 className="text-xl font-bold text-[#285c46] mb-4">✨ {t.problemSolution.solutionTitle}</h3>
              <div className="space-y-3">
                {t.problemSolution.solutions.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[#285c46] text-sm">
                    <span className="text-[#429874] mt-0.5">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">{t.whatWeDo.title}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {t.whatWeDo.items.map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-6">
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Different Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">{t.whyDifferent.title}</h2>
          <div className="space-y-4">
            {t.whyDifferent.comparison.map((item, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-red-400 text-xl">✗</span>
                  <span className="text-red-900">{item.others}</span>
                </div>
                <div className="bg-[#f0f9f6] rounded-xl p-4 flex items-center gap-3 border border-[#d4ede3]">
                  <span className="text-[#429874] text-xl">✓</span>
                  <span className="text-[#285c46]">{item.daleel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">{t.values.title}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.values.items.map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#357a5d] to-[#429874] text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t.cta.title}</h2>
          <p className="text-xl text-emerald-100 mb-8">{t.cta.subtitle}</p>
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 bg-white text-[#285c46] px-8 py-4 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
          >
            {t.cta.button}
            <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{t.contact.title}</h2>
          <p className="text-slate-600 mb-4">{t.contact.text}</p>
          <a
            href={`mailto:${t.contact.email}`}
            className="text-[#357a5d] font-medium hover:text-[#285c46] text-lg"
          >
            {t.contact.email}
          </a>
        </div>
      </section>
    </main>
  );
}

