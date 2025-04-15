import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface MenuProps {
  onGameStart: () => void;
}

export const Menu: React.FC<MenuProps> = ({ onGameStart }) => {
  const [lightningAddress, setLightningAddress] = useState("");
  const [invoice, setInvoice] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [status, setStatus] = useState<"INITIAL" | "PENDING" | "PAID">(
    "INITIAL"
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProcessor, setPaymentProcessor] = useState<"lnbits" | "voltage_payments" | null>(null);

  useEffect(() => {
    console.debug("status", status);
  }, [status]);

  useEffect(() => {
    let intervalId: number;

    if (status === "PENDING" && invoiceId && paymentProcessor) {
      intervalId = window.setInterval(async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/invoice?id=${invoiceId}&processor=${paymentProcessor}`
          );
          const data = await response.json();
          console.debug("check payment status", data);

          // Handle Voltage Payments polling
          if (paymentProcessor === "voltage_payments" && data.payment_request) {
            setInvoice(data.payment_request);
          }

          if (data.status === "PAID") {
            setStatus("PAID");
            onGameStart();
          }
        } catch (err) {
          console.error("Error checking payment status:", err);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, invoiceId, paymentProcessor, onGameStart]);

  const handleJoinGame = async () => {
    if (!lightningAddress) {
      setError("Please enter a lightning address");
      return;
    }

    // Prevent duplicate submissions
    if (isLoading || status !== "INITIAL") {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lightningAddress }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Store the lightning address for later use
      localStorage.setItem('lightningAddress', lightningAddress);

      setInvoice(data.payment_request || ""); // Might be null for Voltage Payments initially
      setInvoiceId(data.invoice_id);
      setPaymentProcessor(data.payment_processor);
      setStatus("PENDING");
    } catch (err) {
      // Handle specific error messages from the server
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to generate invoice. Please try again.");
      }
      console.error("Error generating invoice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Welcome to BitDoom
        </h1>

        {status === "INITIAL" && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="lightning-address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Lightning Address
              </label>
              <input
                id="lightning-address"
                type="text"
                value={lightningAddress}
                onChange={(e) => setLightningAddress(e.target.value)}
                placeholder="your@lightning.address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleJoinGame}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Generating Invoice..." : "Join Game"}
            </button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        )}

        {status === "PENDING" && invoice && (
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">Scan QR Code to Pay</p>
            <div className="flex justify-center">
              <QRCodeSVG value={invoice} size={256} />
            </div>
            <p className="text-sm text-gray-600">
              Waiting for payment confirmation...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
