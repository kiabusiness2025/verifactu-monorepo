"use client";

import React, { useState } from "react";

export function CreateInvoiceForm() {
  const [invoice, setInvoice] = useState({
    id: "",
    number: "",
    issueDate: "",
    total: 0,
    tax: {
      rate: 0.21,
      amount: 0,
    },
    customer: {
      name: "",
      nif: "",
    },
    issuer: {
      name: "Mi Empresa",
      nif: "A12345678",
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/verifactu/register-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoice),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div>
            <label htmlFor="number">Invoice Number</label>
            <input
              type="text"
              id="number"
              value={invoice.number}
              onChange={(e) => setInvoice({ ...invoice, number: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="issueDate">Issue Date</label>
            <input
              type="date"
              id="issueDate"
              value={invoice.issueDate}
              onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="total">Total</label>
            <input
              type="number"
              id="total"
              value={invoice.total}
              onChange={(e) => setInvoice({ ...invoice, total: parseFloat(e.target.value) })}
            />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <label htmlFor="customerName">Customer Name</label>
            <input
              type="text"
              id="customerName"
              value={invoice.customer.name}
              onChange={(e) =>
                setInvoice({
                  ...invoice,
                  customer: { ...invoice.customer, name: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label htmlFor="customerNif">Customer NIF</label>
            <input
              type="text"
              id="customerNif"
              value={invoice.customer.nif}
              onChange={(e) =>
                setInvoice({
                  ...invoice,
                  customer: { ...invoice.customer, nif: e.target.value },
                })
              }
            />
          </div>
        </div>
      </div>
      <button type="submit">Create Invoice</button>
    </form>
  );
}
