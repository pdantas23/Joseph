import { useLocation } from "wouter";

const C = {
  brown:    "#333333",
  bege1:    "#B3B3B3",
  bege3:    "#E6E6E6",
  offwhite: "#F2F2F2",
  white:    "#FFFFFF",
} as const;

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-screen w-full items-center justify-center"
      style={{ backgroundColor: C.offwhite, fontFamily: "'Fira Sans', 'Helvetica Neue', Arial, sans-serif" }}>
      <div className="mx-4 w-full max-w-md flex flex-col items-center text-center p-12 bg-white"
        style={{ border: `1px solid ${C.bege3}` }}>

        <span className="text-[9px] font-light tracking-[0.55em] uppercase mb-1" style={{ color: C.bege1 }}>
          Joseph
        </span>
        <span className="text-lg font-light tracking-wider mb-10"
          style={{ color: C.brown, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          Atelier
        </span>

        <div className="w-8 h-px mb-8" style={{ backgroundColor: C.bege3 }} />

        <p className="text-5xl font-light mb-3" style={{ color: C.brown, fontFamily: "'Georgia', serif" }}>404</p>
        <p className="text-sm font-light mb-2" style={{ color: C.brown }}>Página não encontrada</p>
        <p className="text-xs font-light leading-relaxed mb-8" style={{ color: C.bege1 }}>
          A página que você está procurando não existe ou foi removida.
        </p>

        <button onClick={() => setLocation("/")}
          className="text-[10px] font-medium tracking-[0.35em] uppercase px-8 py-3 transition hover:opacity-80"
          style={{ backgroundColor: C.brown, color: C.white, border: "none", cursor: "pointer", borderRadius: "1px" }}>
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
