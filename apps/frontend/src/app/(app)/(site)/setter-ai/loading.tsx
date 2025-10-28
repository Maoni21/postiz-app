export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-customColor6/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-customColor6 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-textColor/60 text-sm">Chargement du Setter IA...</p>
      </div>
    </div>
  );
}