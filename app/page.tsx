import { SectionHeader } from '@/components/ui'

export default function Home() {
  return (
    <section className="sp-section" data-testid="home-page">
      <SectionHeader
        kicker="Skypermit"
        title="Drone flight authorisation"
        subhead="Use the header to switch between the Operator portal and the Reviewer queue. Operators log in; reviewers identify with a Reviewer ID entered in the header."
      />
    </section>
  )
}
