import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export const dynamic = 'force-dynamic';

import { CreateInvoiceForm } from "@/components/invoices/CreateInvoiceForm";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Create Invoice | VeriFactu",
  description: "Create a new invoice",
};

export default function CreateInvoicePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Create Invoice" />
      <CreateInvoiceForm />
    </div>
  );
}
