// Aparece na hora ao trocar de tela, enquanto os dados chegam.
export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="aparece">
      <div className="mb-6 space-y-2">
        <div className="esqueleto h-3 w-32" />
        <div className="esqueleto h-8 w-48" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="cartao space-y-2.5">
            <div className="esqueleto h-3 w-20" />
            <div className="esqueleto h-7 w-24" />
            <div className="esqueleto h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="cartao space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="esqueleto size-11" />
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
