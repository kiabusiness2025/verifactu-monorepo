import 'package:flutter/material.dart';
import 'package:verifactu_mobile/services/invoice_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class InvoicesPage extends StatefulWidget {
  final String tenantId;
  
  const InvoicesPage({super.key, required this.tenantId});

  @override
  State<InvoicesPage> createState() => _InvoicesPageState();
}

class _InvoicesPageState extends State<InvoicesPage> {
  final _invoiceService = InvoiceService();
  String _selectedStatus = 'all';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Facturas'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _selectedStatus = value);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('Todas')),
              const PopupMenuItem(value: 'draft', child: Text('Borrador')),
              const PopupMenuItem(value: 'sent', child: Text('Enviadas')),
              const PopupMenuItem(value: 'paid', child: Text('Pagadas')),
            ],
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: _selectedStatus == 'all'
            ? _invoiceService.getInvoices(widget.tenantId)
            : _invoiceService.getInvoicesByStatus(widget.tenantId, _selectedStatus),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Text('Error: ${snapshot.error}'),
            );
          }

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final invoices = snapshot.data!.docs;

          if (invoices.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.receipt_long_outlined,
                    size: 80,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No hay facturas',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('Crea tu primera factura'),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: invoices.length,
            padding: const EdgeInsets.all(16),
            itemBuilder: (context, index) {
              final invoice = invoices[index].data() as Map<String, dynamic>;
              final invoiceId = invoices[index].id;

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getStatusColor(invoice['status']),
                    child: Icon(
                      _getStatusIcon(invoice['status']),
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    invoice['number'],
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(invoice['customerName']),
                      const SizedBox(height: 4),
                      Text(
                        '${(invoice['amountGross'] as num).toStringAsFixed(2)} €',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  trailing: Chip(
                    label: Text(
                      _getStatusLabel(invoice['status']),
                      style: const TextStyle(fontSize: 12),
                    ),
                    backgroundColor: _getStatusColor(invoice['status']).withOpacity(0.2),
                  ),
                  onTap: () {
                    _showInvoiceDetails(context, invoiceId, invoice);
                  },
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateInvoiceDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Nueva Factura'),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'draft':
        return Colors.grey;
      case 'sent':
        return Colors.blue;
      case 'paid':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'draft':
        return Icons.edit_outlined;
      case 'sent':
        return Icons.send_outlined;
      case 'paid':
        return Icons.check_circle_outlined;
      default:
        return Icons.circle_outlined;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'sent':
        return 'Enviada';
      case 'paid':
        return 'Pagada';
      default:
        return status;
    }
  }

  void _showInvoiceDetails(BuildContext context, String invoiceId, Map<String, dynamic> invoice) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              invoice['number'],
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _DetailRow(label: 'Cliente', value: invoice['customerName']),
            _DetailRow(label: 'NIF', value: invoice['customerNif'] ?? '-'),
            _DetailRow(label: 'Bruto', value: '${(invoice['amountGross'] as num).toStringAsFixed(2)} €'),
            _DetailRow(label: 'IVA', value: '${(invoice['amountTax'] as num).toStringAsFixed(2)} €'),
            _DetailRow(label: 'Neto', value: '${(invoice['amountNet'] as num).toStringAsFixed(2)} €'),
            _DetailRow(label: 'Estado', value: _getStatusLabel(invoice['status'])),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Editar factura próximamente')),
                      );
                    },
                    icon: const Icon(Icons.edit),
                    label: const Text('Editar'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _invoiceService.updateInvoiceStatus(invoiceId, 'sent');
                    },
                    icon: const Icon(Icons.send),
                    label: const Text('Enviar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateInvoiceDialog(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Crear factura próximamente'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: Colors.grey[600]),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
