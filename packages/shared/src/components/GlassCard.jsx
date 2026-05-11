export default function GlassCard({
  children,
  className = '',
  as: Component = 'div',
  ...rest
}) {
  return (
    <Component
      className={`glass rounded-2xl p-5 sm:p-6 ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
