import Link from "next/link";

export default function CertNotFound() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Certificate Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          This certificate number does not exist or may have been revoked.
          If you believe this is an error, please contact support.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors text-sm"
        >
          Go to Daleel
        </Link>
      </div>
    </div>
  );
}
