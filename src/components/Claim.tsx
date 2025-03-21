import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ClaimProps {
  sats: number;
  lightningAddress: string;
}

export const Claim: React.FC<ClaimProps> = ({ sats, lightningAddress }) => {
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed" | "error" | null>(null);
  const [bolt11Invoice, setBolt11Invoice] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchWithdrawalInvoice = async () => {
      if (sats <= 0 || !lightningAddress) {
        setError("No sats to withdraw or no lightning address provided");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/withdraw`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lightningAddress,
            amount: sats,
          }),
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setInvoice(data.payment_request);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to generate withdrawal invoice. Please try again.");
        }
        console.error("Error generating withdrawal invoice:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWithdrawalInvoice();
  }, [sats, lightningAddress]);

  useEffect(() => {
    let intervalId: number;

    const checkPaymentStatus = async () => {
      if (!paymentId) return;

      try {
        const response = await fetch(`${API_BASE_URL}/payment-status/${paymentId}`);
        const data = await response.json();

        if (data.status === "completed") {
          setPaymentStatus("completed");
          clearInterval(intervalId);
        } else if (data.status === "error") {
          setPaymentStatus("error");
          setError(data.error || "Payment failed");
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
        setError("Failed to check payment status");
        clearInterval(intervalId);
      }
    };

    if (paymentStatus === "pending" && paymentId) {
      intervalId = window.setInterval(checkPaymentStatus, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [paymentStatus, paymentId]);

  const handlePayment = async () => {
    if (!bolt11Invoice) {
      setError("Please enter a BOLT11 invoice");
      return;
    }

    setIsLoading(true);
    setError("");
    setPaymentStatus("pending");

    try {
      const response = await fetch(`${API_BASE_URL}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_request: bolt11Invoice,
          amount: sats,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPaymentId(data.payment_id);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to process payment. Please try again.");
      }
      setPaymentStatus("error");
      console.error("Error processing payment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Claim Your Bitcoin</h1>
        
        <div className="text-center mb-6">
          <p className="text-lg font-medium">Your Balance</p>
          <p className="text-2xl font-bold text-green-600">{sats} sats</p>
        </div>

        {isLoading && (
          <div className="text-center">
            <p className="text-gray-600">Processing payment...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {paymentStatus === "completed" && (
          <div className="text-center text-green-600 font-bold">
            <p>Payment successful! Your sats have been sent.</p>
          </div>
        )}

        {!paymentStatus && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="bolt11-invoice"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                BOLT11 Invoice
              </label>
              <input
                id="bolt11-invoice"
                type="text"
                value={bolt11Invoice}
                onChange={(e) => setBolt11Invoice(e.target.value)}
                placeholder="lntbs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handlePayment}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Pay"}
            </button>
          </div>
        )}

        {invoice && (
          <div className="text-center space-y-4 mt-6">
            <p className="text-lg font-medium">Or Scan QR Code to Receive Payment</p>
            <div className="flex justify-center">
              <QRCodeSVG value={invoice} size={256} />
            </div>
            <p className="text-sm text-gray-600">
              Payment will be sent to: {lightningAddress}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 