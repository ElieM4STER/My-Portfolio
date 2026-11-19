import Reveal from './Reveal'
import Icon from './Icons'

export default function SectionHead({ tag, title, accent, icon }) {
  return (
    <Reveal>
      <div className="section-head">
        <p className="section-tag">
          {icon ? <Icon name={icon} /> : null}
          {tag}
        </p>
        <h2 className="section-title">
          {title} <span className="accent">{accent}</span>
        </h2>
      </div>
    </Reveal>
  )
}
