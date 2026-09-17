// La metadata del catálogo vive en `page.tsx`: depende de los filtros de la
// querystring y un layout no recibe `searchParams`.
export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
