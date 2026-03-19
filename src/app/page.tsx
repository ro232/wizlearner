'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Type,
  Hash,
  Shapes,
  Brain,
  Puzzle,
  Search,
  GraduationCap,
  Calendar,
  Settings2,
  Download,
  Zap,
  Star,
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pb-28">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(circle at 20% 50%, rgba(46, 92, 138, 0.1) 0%, transparent 50%)',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-up">
            <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50/50 text-blue-700">
              <Sparkles className="w-3 h-3 mr-1" />
              New — AI Worksheet Generator
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight text-slate-900">
              Create perfect
              <br />
              practice sheets
              <br />
              <span className="gradient-text-blue">in seconds</span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed text-slate-600 max-w-xl">
              AI-powered worksheets for letter tracing, numbers, shapes, math, and more. Fully customizable, instant downloads. Perfect for preschool, kindergarten, and homeschooling.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/generator" className="flex-shrink-0">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-white px-8 h-14 text-base rounded-2xl shadow-lg btn-premium hover:shadow-xl transition-shadow"
                  style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}
                >
                  Start Free — No Account Needed <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-14 text-base rounded-2xl border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                See Examples
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      background: [
                        'linear-gradient(135deg, #2563EB, #1e40af)',
                        'linear-gradient(135deg, #059669, #047857)',
                        'linear-gradient(135deg, #EA580C, #d97706)',
                        'linear-gradient(135deg, #7C3AED, #6d28d9)',
                      ][i],
                    }}
                  >
                    {String(i + 1).padStart(1, '0')}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  2,847+ parents trust <span className="gradient-text-blue">WorksheetWiz</span>
                </p>
                <p className="text-xs text-slate-500">Creating better learning experiences daily</p>
              </div>
            </div>
          </div>

          <div className="relative h-96 md:h-full flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl" />
            <div
              className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">Letter Tracing - A</span>
                </div>

                <div className="space-y-3 bg-slate-50 rounded-2xl p-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 h-8 rounded-lg bg-slate-200/60" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <div className="flex-1 h-10 rounded-lg bg-slate-100/60" />
                  <div className="flex-1 h-10 rounded-lg bg-orange-100/60" />
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg flex items-center justify-center">
                <Download className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { label: 'Worksheets Generated', value: '50,000+' },
    { label: 'Letters + Diacritics', value: '26' },
    { label: 'Worksheet Types', value: '8' },
    { label: 'Star Rating', value: '4.9/5' },
  ];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-r from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-bold text-slate-900">
                {stat.value}
              </div>
              <p className="text-sm md:text-base text-slate-600 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Pick Your Content',
      desc: 'Choose from letters, numbers, shapes, math, games, and more. 8 worksheet types to explore.',
      icon: Type,
      color: 'blue',
    },
    {
      num: '02',
      title: 'Customize Everything',
      desc: 'Adjust fonts, difficulty, colors, sizes, and layout in seconds. Fully personalized worksheets.',
      icon: Settings2,
      color: 'orange',
    },
    {
      num: '03',
      title: 'Download & Print',
      desc: 'Get instant PDF downloads. No watermarks, no hidden paywalls. Print whenever you want.',
      icon: Download,
      color: 'green',
    },
  ];

  return (
    <section className="py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900">How it works</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Three simple steps to create perfect worksheets for your classroom or home
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const colorClasses: Record<string, string> = {
              blue: 'bg-blue-50 text-blue-600 border-blue-200',
              orange: 'bg-orange-50 text-orange-600 border-orange-200',
              green: 'bg-green-50 text-green-600 border-green-200',
            };

            return (
              <div
                key={i}
                className="group relative rounded-2xl border-2 border-slate-200 p-8 hover:border-slate-300 transition-all duration-300 hover-lift"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative space-y-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 ${colorClasses[step.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="text-4xl font-bold text-slate-200 mb-1">{step.num}</div>
                    <h3 className="text-2xl font-bold text-slate-900">{step.title}</h3>
                  </div>

                  <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                </div>

                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-1 bg-gradient-to-r from-slate-300 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const features = [
    { title: 'Letter Tracing', icon: Type, color: 'blue' },
    { title: 'Number Practice', icon: Hash, color: 'green' },
    { title: 'Shape Tracing', icon: Shapes, color: 'purple' },
    { title: 'Math Worksheets', icon: Zap, color: 'orange' },
    { title: 'Games & Activities', icon: Puzzle, color: 'red' },
    { title: 'Word Search', icon: Search, color: 'teal' },
    { title: 'AI Generator', icon: Brain, color: 'indigo' },
    { title: 'Classroom Mode', icon: GraduationCap, color: 'emerald' },
    { title: 'Curriculum Builder', icon: Calendar, color: 'cyan' },
  ];

  const colorGradients: Record<string, string> = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    purple: 'from-purple-400 to-purple-600',
    orange: 'from-orange-400 to-orange-600',
    red: 'from-red-400 to-red-600',
    teal: 'from-teal-400 to-teal-600',
    indigo: 'from-indigo-400 to-indigo-600',
    emerald: 'from-emerald-400 to-emerald-600',
    cyan: 'from-cyan-400 to-cyan-600',
  };

  return (
    <section className="py-28 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Powerful features for every need</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to create engaging educational worksheets for all skill levels
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={i}
                className="border-slate-200 hover:shadow-lg transition-all duration-300 hover-lift cursor-pointer group"
              >
                <CardContent className="pt-8">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${colorGradients[feature.color]} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-900 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Professional-grade tools for educators and parents
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Pricing section
function PricingSection() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for trying it out',
      popular: false,
      features: ['5 letters (A-E)', '5 numbers', '3 shapes', '2 downloads/day', 'Basic templates'],
      cta: 'Start Free',
    },
    {
      name: 'Starter',
      price: '$4.99',
      description: 'Most popular choice',
      popular: true,
      features: [
        'All letters & numbers',
        'All shapes',
        'Unlimited downloads',
        'Cloud save (20 sheets)',
        '10 custom templates',
        'Priority support',
      ],
      cta: 'Get Starter',
    },
    {
      name: 'Full Access',
      price: '$9.99',
      description: 'Complete power user',
      popular: false,
      features: [
        'Everything in Starter',
        'AI content generator',
        'Math & pre-writing sheets',
        'Word search builder',
        'Game templates',
        'Classroom mode',
        'Curriculum builder',
        'Commercial license',
      ],
      cta: 'Get Full Access',
    },
  ];

  return (
    <section id="pricing" className="py-28 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Simple, transparent pricing</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
          {tiers.map((tier, i) => (
            <Card
              key={i}
              className={`border-slate-200 flex flex-col transition-all duration-300 hover-lift ${
                tier.popular
                  ? 'md:scale-105 md:shadow-2xl border-blue-300 bg-gradient-to-br from-blue-50 to-white ring-2 ring-blue-200'
                  : 'hover:shadow-lg'
              }`}
            >
              {tier.popular && (
                <div className="px-6 pt-6">
                  <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription className="text-base text-slate-600">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                <div>
                  <span className="text-5xl font-bold text-slate-900">{tier.price}</span>
                  {tier.price !== '$0' && <span className="text-slate-600 ml-2">one-time</span>}
                </div>

                <ul className="space-y-3">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-11 rounded-xl font-semibold transition-all ${
                    tier.popular
                      ? 'text-white btn-premium'
                      : 'border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                  style={
                    tier.popular
                      ? { background: 'linear-gradient(135deg, #E8913A, #d97706)' }
                      : undefined
                  }
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-600">
            <button className="text-blue-600 font-semibold hover:underline">No credit card required.</button>
          </p>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      quote: 'WorksheetWiz saved me countless hours of design work. My kids love the variety and I love how easy it is to create custom worksheets tailored to their needs.',
      author: 'Elena M.',
      role: 'Parent of 3',
      rating: 5,
    },
    {
      quote: 'As a teacher managing 30+ students, creating differentiated worksheets is now effortless. The quality is professional-grade and my students are more engaged than ever.',
      author: 'David R.',
      role: 'Elementary Teacher',
      rating: 5,
    },
    {
      quote: 'Homeschooling just got so much easier! The AI generator understands exactly what I need, and the customization options are incredible. Worth every penny.',
      author: 'Ana P.',
      role: 'Homeschool Mom',
      rating: 5,
    },
  ];

  return (
    <section className="py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Loved by educators & parents</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Join thousands of satisfied users creating better learning materials every day</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <Card key={i} className="border-slate-200 hover:shadow-lg transition-all duration-300 hover-lift">
              <CardContent className="pt-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-slate-700 italic mb-6">{`"${testimonial.quote}"`}</p>

                <div>
                  <p className="font-semibold text-slate-900">{testimonial.author}</p>
                  <p className="text-sm text-slate-600">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div
        className="max-w-4xl mx-auto px-4 sm:px-6 rounded-3xl p-12 md:p-16 text-center space-y-8 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 58, 138, 0.98) 100%)',
        }}
      >
        <div className="absolute inset-0 rounded-3xl opacity-10 noise-bg" />

        <div className="relative space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Ready to make<br />learning fun?
          </h2>

          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Create beautiful, effective worksheets in minutes. No design skills. No complicated setup. Just instant, perfect worksheets.
          </p>

          <div className="pt-4">
            <Link href="/generator">
              <Button
                size="lg"
                className="text-white px-10 h-14 text-lg rounded-2xl shadow-lg btn-premium hover:shadow-xl transition-shadow"
                style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}
              >
                Start Creating Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-blue-200">No credit card required • Start free today</p>
        </div>
      </div>
    </section>
  );
}

// Main page component
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <FeaturesGrid />
      <PricingSection />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}
