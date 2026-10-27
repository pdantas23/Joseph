import { useId } from "react";

/**
 * Glifo oficial do Instagram (câmera em contorno) com o gradiente oficial:
 * amarelo e laranja embaixo à esquerda, rosa e magenta no meio, roxo em cima
 * à direita. O gradiente usa coordenadas do desenho (userSpaceOnUse) para
 * correr contínuo pelas três formas; id único por instância (useId).
 */
export default function InstagramIcon({ className = "h-4 w-4", title }: { className?: string; title?: string }) {
  const id = `ig-${useId().replace(/:/g, "")}`;
  const cor = `url(#${id})`;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="3" y1="21" x2="21" y2="3">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.25" stopColor="#FA7E1E" />
          <stop offset="0.5" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="5.6" fill="none" stroke={cor} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke={cor} strokeWidth="2" />
      <circle cx="17.6" cy="6.4" r="1.3" fill={cor} />
    </svg>
  );
}
