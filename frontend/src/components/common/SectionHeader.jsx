export default function SectionHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="section-header">
      {Icon ? (
        <div className="section-icon">
          <Icon size={17} strokeWidth={1.8} />
        </div>
      ) : null}
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}
