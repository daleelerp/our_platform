"use client";

import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import Image from "next/image";

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
        button: "Explore Learning Paths"
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
        button: "استكشف مسارات التعلم"
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
      <section className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="text-xl text-teal-100">{t.subtitle}</p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">{t.story.title}</h2>
          <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
            {t.story.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">{t.mission.title}</h2>
          <p className="text-xl text-slate-600 leading-relaxed">{t.mission.text}</p>
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
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-10 text-center">{t.whyDifferent.title}</h2>
          <div className="space-y-4">
            {t.whyDifferent.comparison.map((item, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-red-400 text-xl">✗</span>
                  <span className="text-slate-300">{item.others}</span>
                </div>
                <div className="bg-teal-900/50 rounded-xl p-4 flex items-center gap-3 border border-teal-700">
                  <span className="text-teal-400 text-xl">✓</span>
                  <span className="text-teal-100">{item.daleel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">{t.values.title}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.values.items.map((item, i) => (
              <div key={i} className="text-center p-6">
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t.cta.title}</h2>
          <p className="text-xl text-teal-100 mb-8">{t.cta.subtitle}</p>
          <Link
            href="/paths"
            className="inline-flex items-center gap-2 bg-white text-teal-700 px-8 py-4 rounded-xl font-semibold hover:bg-teal-50 transition-colors"
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
            className="text-teal-600 font-medium hover:text-teal-700 text-lg"
          >
            {t.contact.email}
          </a>
        </div>
      </section>
    </main>
  );
}

