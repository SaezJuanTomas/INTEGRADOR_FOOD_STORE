import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { confirmPayment } from "../services/api";

export default function OrderRedirectPage() {
  const { pedidoId, status } = useParams<{ pedidoId: string; status: string }>();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const id = Number(pedidoId);

  useEffect(() => {
    if (Number.isNaN(id)) {
      setResult({ ok: false, msg: "ID de pedido inválido." });
      return;
    }

    const paymentId = searchParams.get("payment_id");
    const paymentIdNum = paymentId ? Number(paymentId) : undefined;

    confirmPayment(id, paymentIdNum)
      .then((res) => {
        if (res.estado === "aprobado") {
          setResult({ ok: true, msg: "Pago aprobado correctamente." });
        } else if (res.estado === "rechazado") {
          setResult({ ok: false, msg: "El pago fue rechazado." });
        } else {
          setResult({ ok: true, msg: "Pago registrado. Estado: " + (res.estado ?? "pendiente") });
        }
      })
      .catch((err: Error) => {
        setResult({ ok: false, msg: err.message });
      });
  }, [id]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        {!result ? (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-gray-600">Verificando pago...</p>
          </>
        ) : result.ok ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              &#10003;
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Pago exitoso</h1>
            <p className="mb-6 text-gray-600">{result.msg}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              &#10007;
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Error en el pago</h1>
            <p className="mb-6 text-gray-600">{result.msg}</p>
          </>
        )}

        <div className="flex justify-center gap-4">
          <Link
            to={id ? `/ventas/${id}` : "/ventas"}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ver detalle del pedido
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
