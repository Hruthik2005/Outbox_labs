import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Layers,
  Activity,
  Search,
  Bell,
  ArrowRight,
  CheckCircle2,
  Send,
  ShieldCheck,
  Server
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 lg:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left: Headline & Copy */}
            <div className="lg:col-span-6 space-y-8 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-zinc-700">
                  BullMQ & Redis Architecture Active
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-950 leading-[1.08]">
                  Emails scheduled.
                  <br />
                  <span className="text-zinc-500">Outreach simplified.</span>
                </h1>
                <p className="text-lg text-zinc-600 max-w-xl leading-relaxed">
                  Plan, schedule, and monitor your email outreach from one reliable workspace.
                  Keep every message organized, on time, and easy to track.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore Features
                  </Button>
                </a>
              </div>

              {/* Guarantees / Badges */}
              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-medium text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-zinc-700" />
                  Redis Distributed Rate Limiting
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-zinc-700" />
                  Transactional Outbox Recovery
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-zinc-700" />
                  Strictly Zero Cron Jobs
                </span>
              </div>
            </div>

            {/* Right: Caarvn-inspired Monochromatic Dashboard Preview Card */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Subtle ornamental glow/ring backdrop */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-zinc-200 to-zinc-100 opacity-60 blur-lg" />

                <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xl space-y-5">
                  {/* Top card header */}
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-900">ReachInbox Dispatcher</div>
                        <div className="text-[10px] text-zinc-500">Worker Concurrency: 5 active workers</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/50">
                      Live Queue Active
                    </span>
                  </div>

                  {/* Scheduled Queue Simulation List */}
                  <div className="space-y-2.5">
                    {[
                      { to: 'sarah.connor@example.com', subject: 'Product update demo', time: 'In 2 min', status: 'SCHEDULED' },
                      { to: 'alex.rivera@enterprise.org', subject: 'Partnership discovery call', time: 'In 4 min', status: 'QUEUED' },
                      { to: 'jordan.lee@techcorp.io', subject: 'Follow-up regarding proposal', time: 'Just now', status: 'SENT' }
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 text-xs"
                      >
                        <div className="space-y-0.5 text-left">
                          <p className="font-semibold text-zinc-900">{item.to}</p>
                          <p className="text-zinc-500 text-[11px]">{item.subject}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${
                              item.status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-zinc-200 text-zinc-800'
                            }`}
                          >
                            {item.status}
                          </span>
                          <p className="text-[10px] text-zinc-400">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Stats inside card */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-center">
                    <div className="rounded-lg bg-zinc-50 p-2">
                      <div className="text-xs text-zinc-500">Pacing</div>
                      <div className="text-sm font-bold text-zinc-900">2.0s / send</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-2">
                      <div className="text-xs text-zinc-500">Hourly Limit</div>
                      <div className="text-sm font-bold text-zinc-900">100 / sender</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-2">
                      <div className="text-xs text-zinc-500">Slack Alerts</div>
                      <div className="text-sm font-bold text-emerald-600">Connected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Engineered For Scale
          </h2>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
            Everything required for bulletproof scheduling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Clock,
              title: 'Reliable Scheduling',
              desc: 'Delayed jobs powered by Redis and BullMQ. Jobs survive server and worker restarts without blind duplicate creation.'
            },
            {
              icon: ShieldCheck,
              title: 'Smart Rate Limiting',
              desc: 'Distributed Redis Lua rate limiter enforces hourly limits per sender and atomic send intervals. Safely reschedules on limit hit.'
            },
            {
              icon: Layers,
              title: 'Multiple Email Senders',
              desc: 'Configure multiple SMTP or Ethereal test accounts with encrypted credentials, custom rate limits, and live connection verification.'
            },
            {
              icon: Activity,
              title: 'Live Queue Monitoring',
              desc: 'Protected live Bull Board dashboard displaying waiting, delayed, active, completed, and failed jobs in real time.'
            },
            {
              icon: Search,
              title: 'Searchable Email History',
              desc: 'Full-text indexing with Elasticsearch by recipient, subject, status, and sender, with strict user-level data isolation.'
            },
            {
              icon: Bell,
              title: 'Slack Notifications',
              desc: 'Real Slack OAuth 2.0 integration with deduplicated alerts sent to your workspace the moment a sender rate limit is encountered.'
            }
          ].map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-300 transition-colors space-y-3 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 sm:p-12 lg:p-16">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Workflow Architecture
            </h2>
            <p className="text-3xl font-bold tracking-tight text-zinc-900">
              Three steps to dependable outreach.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="space-y-3">
              <div className="text-2xl font-bold text-zinc-300">01</div>
              <h4 className="text-base font-semibold text-zinc-900">Configure Senders</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Connect your Ethereal test accounts or custom SMTP hosts. Test authentication and configure per-sender limits.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-zinc-300">02</div>
              <h4 className="text-base font-semibold text-zinc-900">Upload & Schedule</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Upload CSV or TXT recipient files with instant duplicate and email format validation. Choose start time and send delay.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-zinc-300">03</div>
              <h4 className="text-base font-semibold text-zinc-900">Monitor in Real-Time</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Track delivery outcomes, view Ethereal email previews, search across Elasticsearch, and receive Slack limit alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-4xl px-4 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
          Ready to experience reliable email scheduling?
        </h2>
        <p className="text-base text-zinc-600 max-w-lg mx-auto">
          Sign in to access your ReachInbox dashboard, configure your sender accounts, and schedule your email batches with confidence.
        </p>
        <div>
          <Link to="/login">
            <Button size="lg" className="gap-2">
              Launch Dashboard Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
