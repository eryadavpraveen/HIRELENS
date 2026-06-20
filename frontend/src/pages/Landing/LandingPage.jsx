import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { Eye, ArrowRight, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { FEATURES, HOW_IT_WORKS, TAGLINE } from '@/utils/constants'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: 'easeOut' } }),
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">HIRELENS</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/register">Register</Link>
            </Button>
            <Button asChild>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -top-20 right-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        </div>
        <section className="relative mx-auto max-w-5xl px-6 py-24 text-center lg:py-32">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            AI-Powered Interview Integrity
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={1}
            variants={fadeUp}
            className="bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-8xl"
          >
            HIRELENS
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            AI-Powered Interview Monitoring &amp; Integrity Assessment System
          </motion.p>

          <motion.p
            initial="hidden"
            animate="show"
            custom={3}
            variants={fadeUp}
            className="mt-3 text-base font-medium gradient-text"
          >
            {TAGLINE}
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={4}
            variants={fadeUp}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button asChild size="lg">
              <Link to="/login">Login <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">Learn More</a>
            </Button>
          </motion.div>
        </section>
      </header>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20">
        <h2 className="text-center text-3xl font-bold">Built for Interview Integrity</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          A complete AI proctoring suite — see beyond the resume with real-time monitoring.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => {
            const Icon = Icons[feature.icon] || Icons.Sparkles
            return (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                variants={fadeUp}
              >
                <Card className="group h-full">
                  <div className="mb-4 inline-flex rounded-xl bg-primary/15 p-3 text-primary transition-colors group-hover:bg-primary/25">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                {step.step < 4 && (
                  <ArrowRight className="absolute right-0 top-6 hidden h-5 w-5 translate-x-1/2 text-muted-foreground lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Card className="flex flex-col items-center gap-6 bg-gradient-to-br from-primary/10 to-purple-500/10 py-12 text-center">
          <h2 className="text-3xl font-bold">Ready to see beyond the resume?</h2>
          <p className="max-w-xl text-muted-foreground">
            Conduct secure, AI-monitored interviews and generate professional integrity reports in minutes.
          </p>
          <Button asChild size="lg">
            <Link to="/login">Get Started <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <span className="font-semibold">HIRELENS</span>
            <span className="text-sm text-muted-foreground">— {TAGLINE}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a href="mailto:contact@hirelens.io" className="flex items-center gap-1 transition-colors hover:text-foreground">
              <Mail className="h-4 w-4" /> Contact
            </a>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms &amp; Conditions</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 HIRELENS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
