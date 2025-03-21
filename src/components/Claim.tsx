import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ClaimProps {
  sats: number;
  lightningAddress: string;
}

export const Claim: React.FC<ClaimProps> = ({ sats, lightningAddress }) => {
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
            <p className="text-gray-600">Generating withdrawal invoice...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {invoice && (
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">Scan QR Code to Receive Payment</p>
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