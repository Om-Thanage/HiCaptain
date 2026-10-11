import Link from 'next/link';
import {
  ArrowRight, Bell, CalendarDays, Check, CheckCircle2, Clock3,
  FolderKanban, GitBranch, MessageSquareText, MoreHorizontal, Sparkles,
  Users, Zap,
} from 'lucide-react';

const benefits = [
  { icon: Users, title: 'Work better together', text: 'Give every teammate a clear view of their projects, tasks, and next steps.', tone: 'violet' },
  { icon: GitBranch, title: 'Stay connected', text: 'Keep development activity close to the work with GitHub integration.', tone: 'cream' },
  { icon: CalendarDays, title: 'Never miss a beat', text: 'Bring meetings, deadlines, and your team schedule into one place.', tone: 'lime' },
];

function Brand() {
  return <span className="hc-brand"><span className="hc-brand-mark">✦</span>HiCaptain<span className="hc-brand-dot">.</span></span>;
}

function DashboardPreview() {
  return (
    <div className="hc-preview" aria-label="Preview of the HiCaptain workspace">
      <div className="hc-preview-toolbar"><Brand /><span>Overview <span className="hc-preview-caret">⌄</span></span><span className="hc-preview-avatar">S</span></div>
      <div className="hc-preview-content">
        <div className="hc-preview-greeting"><div><small>MONDAY, YOUR WORKSPACE IS READY</small><strong>Good morning, Sarah 👋</strong><span>Here’s what your team is moving forward today.</span></div><span className="hc-preview-more"><MoreHorizontal size={18} /></span></div>
        <div className="hc-preview-stats">
          <div className="hc-preview-stat"><span className="hc-stat-icon violet"><FolderKanban size={18} /></span><small>Active projects</small><strong>12</strong><span className="hc-preview-trend">↗ 8% this month</span></div>
          <div className="hc-preview-stat"><span className="hc-stat-icon yellow"><CheckCircle2 size={18} /></span><small>Tasks completed</small><strong>48</strong><span className="hc-preview-trend">↗ 12% this week</span></div>
          <div className="hc-preview-stat"><span className="hc-stat-icon lime"><Users size={18} /></span><small>Team members</small><strong>16</strong><span className="hc-preview-trend">Across 4 teams</span></div>
        </div>
        <div className="hc-preview-bottom">
          <div className="hc-preview-panel"><div className="hc-preview-panel-title"><strong>Project progress</strong><span>View all →</span></div><div className="hc-preview-project"><span className="hc-preview-project-mark violet">✳</span><div><strong>Website refresh</strong><span>Design & development</span></div><b>82%</b></div><div className="hc-progress"><span style={{ width: '82%' }} /></div><div className="hc-preview-project"><span className="hc-preview-project-mark lime">◈</span><div><strong>Mobile experience</strong><span>Product design</span></div><b>64%</b></div><div className="hc-progress lime"><span style={{ width: '64%' }} /></div></div>
          <div className="hc-preview-panel hc-preview-tasks"><div className="hc-preview-panel-title"><strong>Up next</strong><span>Today</span></div><div><Check size={14} /> Review sprint goals</div><div><Clock3 size={14} /> Team catch-up <b>11:00</b></div><div><Bell size={14} /> Send client update <b>14:30</b></div></div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="hc-landing">
      <header className="hc-public-nav hc-container">
        <Link href="/" aria-label="HiCaptain home"><Brand /></Link>
        <nav aria-label="Site navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#about">About</a></nav>
        <Link href="/auth?mode=login" className="hc-pill-button dark">Open workspace <ArrowRight size={15} /></Link>
      </header>

      <main>
        <section className="hc-hero hc-container">
          <div className="hc-hero-copy"><span className="hc-eyebrow"><Sparkles size={13} /> YOUR TEAM, IN SYNC</span><h1>Make room for your <em>best work.</em></h1><p>Projects, people, and progress finally feel connected. One calm workspace for everything your team needs to move forward.</p><div className="hc-hero-actions"><Link href="/auth?mode=register" className="hc-pill-button yellow">Get started <ArrowRight size={17} /></Link><Link href="/auth?mode=login" className="hc-pill-button outline">Sign in</Link></div><div className="hc-hero-proof"><span className="hc-avatar-stack"><i>S</i><i>M</i><i>A</i></span><span>Built for teams that make things happen</span></div></div>
          <DashboardPreview />
          <div className="hc-hero-orbit hc-orbit-one" /><div className="hc-hero-orbit hc-orbit-two" />
        </section>

        <section className="hc-logo-strip hc-container" aria-label="HiCaptain capabilities"><span>ONE PLACE FOR IT ALL</span><div><span><FolderKanban size={18} /> Projects</span><span><CheckCircle2 size={18} /> Tasks</span><span><CalendarDays size={18} /> Schedule</span><span><GitBranch size={18} /> GitHub</span><span><MessageSquareText size={18} /> Feedback</span></div></section>

        <section id="features" className="hc-feature-section hc-container"><div className="hc-section-heading"><span className="hc-kicker">WHY HICAPTAIN</span><h2>Everything clicks<br />when work is clear.</h2><p>Less jumping between tools. More focus on the people and projects that matter.</p></div><div className="hc-benefit-grid">{benefits.map(({ icon: Icon, title, text, tone }) => <article key={title} className={`hc-benefit-card ${tone}`}><div className="hc-benefit-icon"><Icon size={22} /></div><h3>{title}</h3><p>{text}</p><span className="hc-benefit-arrow"><ArrowRight size={18} /></span></article>)}</div></section>

        <section id="how-it-works" className="hc-toolkit hc-container"><div className="hc-toolkit-visual"><div className="hc-toolkit-mini"><div className="hc-toolkit-mini-top"><span className="hc-stat-icon violet"><FolderKanban size={18} /></span><span>This week <MoreHorizontal size={17} /></span></div><h3>Keep the momentum.</h3><div className="hc-toolkit-task"><span className="hc-task-check done"><Check size={13} /></span><span>Plan the next sprint</span><span>Done</span></div><div className="hc-toolkit-task"><span className="hc-task-check"><Check size={13} /></span><span>Share project updates</span><span>Today</span></div><div className="hc-toolkit-task"><span className="hc-task-check"><Check size={13} /></span><span>Review new designs</span><span>Tomorrow</span></div></div><span className="hc-toolkit-float">✦ Your team is on track</span></div><div className="hc-toolkit-copy"><span className="hc-kicker">BUILT AROUND YOUR DAY</span><h2>From big picture<br />to next step.</h2><p>See the state of your projects, keep tasks moving, and give everyone the context they need. HiCaptain helps your whole team stay aligned without the noise.</p><ul><li><CheckCircle2 size={19} /> See progress at a glance</li><li><CheckCircle2 size={19} /> Keep ownership and deadlines clear</li><li><CheckCircle2 size={19} /> Bring conversations closer to work</li></ul><Link href="/auth?mode=register" className="hc-pill-button dark">Start your workspace <ArrowRight size={16} /></Link></div></section>

        <section id="about" className="hc-cta hc-container"><div><span className="hc-kicker">READY WHEN YOU ARE</span><h2>Good work starts<br />with a clear plan.</h2><p>Bring your team, projects, and next great idea together in HiCaptain.</p><Link href="/auth?mode=register" className="hc-pill-button dark">Get started <ArrowRight size={16} /></Link></div><div className="hc-cta-art"><span><Zap size={32} /></span><strong>Let’s make<br />it happen.</strong><div className="hc-cta-check"><CheckCircle2 size={17} /> Your next chapter starts here</div></div></section>
      </main>

      <footer className="hc-footer"><div className="hc-container"><div><Brand /><p>A better way to make progress, together.</p></div><div><Link href="/auth?mode=login">Sign in</Link><Link href="/auth?mode=register">Get started</Link><a href="#features">Features</a></div><small>© {new Date().getFullYear()} HiCaptain</small></div></footer>
    </div>
  );
}
