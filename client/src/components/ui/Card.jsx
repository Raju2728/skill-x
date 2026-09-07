import './Card.css';

export default function Card({
  children,
  variant = 'surface',
  padding = 'md',
  interactive = false,
  className = '',
  onClick,
  ...props
}) {
  const Tag = onClick || interactive ? 'button' : 'div';
  return (
    <Tag
      className={`card card-${variant} card-p-${padding} ${interactive ? 'card-interactive' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`card-header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}
