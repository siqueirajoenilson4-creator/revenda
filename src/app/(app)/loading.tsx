// Aparece na hora ao trocar de tela, enquanto os dados chegam.
export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="mb-5 space-y-2">
        <div className="esqueleto h-7 w-40" />
        <div className="esqueleto h-4 w-56" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="cartao space-y-2">
            <div className="esqueleto h-3.5 w-24" />
            <div className="esqueleto h-7 w-28" />
            <div className="esqueleto h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="cartao space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="esqueleto size-10" />
            <div className="flex-1 space-y-1.5">
              <div className="esqueleto h-3.5 w-1/3" />
              <div className="esqueleto h-3 w-1/5" />
            </div>
            <div className="esqueleto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
