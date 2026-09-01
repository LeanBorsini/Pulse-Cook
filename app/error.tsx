'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F1EA] text-[#2C3523]">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl p-8 max-w-md w-full text-center shadow-md">
        <h2 className="text-xl font-bold mb-2">Algo no salió como esperábamos</h2>
        <p className="text-xs text-[#5C6650] mb-6">
          {error?.message || 'Ha ocurrido un error inesperado al procesar la solicitud.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-[#2C3523] text-white rounded-xl text-xs font-bold hover:bg-[#3D4932] transition-colors"
        >
          Intentar nuevamente
        </button>
      </div>
    </div>
  );
}
