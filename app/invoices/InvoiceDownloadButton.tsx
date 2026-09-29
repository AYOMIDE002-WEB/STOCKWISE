"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import InvoiceDocument, { InvoiceData } from "./InvoiceDocument";

export default function InvoiceDownloadButton({ data }: { data: InvoiceData }) {
  return (
    <PDFDownloadLink
      document={<InvoiceDocument data={data} />}
      fileName={`invoice-${data.invoiceNumber}.pdf`}
      className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
    >
      {({ loading }) => (loading ? "Preparing..." : "Download Invoice")}
    </PDFDownloadLink>
  );
}
