import 'package:cloud_firestore/cloud_firestore.dart';

/// Servicio para manejar facturas en Firestore
class InvoiceService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Referencia a la colección de facturas
  CollectionReference get _invoices => _db.collection('invoices');

  // Crear nueva factura
  Future<String> createInvoice({
    required String tenantId,
    required String number,
    required DateTime issueDate,
    required String customerName,
    String? customerNif,
    required double amountGross,
    required double amountTax,
    required double amountNet,
    String? notes,
    required String createdBy,
  }) async {
    final invoice = {
      'tenantId': tenantId,
      'number': number,
      'issueDate': Timestamp.fromDate(issueDate),
      'customerName': customerName,
      'customerNif': customerNif,
      'currency': 'EUR',
      'amountGross': amountGross,
      'amountTax': amountTax,
      'amountNet': amountNet,
      'status': 'draft',
      'notes': notes,
      'createdBy': createdBy,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };

    final docRef = await _invoices.add(invoice);
    return docRef.id;
  }

  // Obtener facturas del tenant
  Stream<QuerySnapshot> getInvoices(String tenantId) {
    return _invoices
        .where('tenantId', isEqualTo: tenantId)
        .orderBy('issueDate', descending: true)
        .snapshots();
  }

  // Obtener facturas con filtro de estado
  Stream<QuerySnapshot> getInvoicesByStatus(String tenantId, String status) {
    return _invoices
        .where('tenantId', isEqualTo: tenantId)
        .where('status', isEqualTo: status)
        .orderBy('issueDate', descending: true)
        .snapshots();
  }

  // Obtener factura por ID
  Future<DocumentSnapshot> getInvoice(String invoiceId) {
    return _invoices.doc(invoiceId).get();
  }

  // Actualizar factura
  Future<void> updateInvoice(String invoiceId, Map<String, dynamic> data) async {
    data['updatedAt'] = FieldValue.serverTimestamp();
    await _invoices.doc(invoiceId).update(data);
  }

  // Cambiar estado de factura
  Future<void> updateInvoiceStatus(String invoiceId, String status) async {
    await _invoices.doc(invoiceId).update({
      'status': status,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Eliminar factura
  Future<void> deleteInvoice(String invoiceId) async {
    await _invoices.doc(invoiceId).delete();
  }

  // Búsqueda de facturas
  Stream<QuerySnapshot> searchInvoices(String tenantId, String query) {
    return _invoices
        .where('tenantId', isEqualTo: tenantId)
        .where('number', isGreaterThanOrEqualTo: query)
        .where('number', isLessThanOrEqualTo: '$query\uf8ff')
        .snapshots();
  }

  // Estadísticas de facturas
  Future<Map<String, dynamic>> getInvoiceStats(String tenantId) async {
    final snapshot = await _invoices
        .where('tenantId', isEqualTo: tenantId)
        .get();

    double totalGross = 0;
    double totalNet = 0;
    int totalCount = snapshot.docs.length;
    int draftCount = 0;
    int sentCount = 0;
    int paidCount = 0;

    for (var doc in snapshot.docs) {
      final data = doc.data() as Map<String, dynamic>;
      totalGross += (data['amountGross'] as num).toDouble();
      totalNet += (data['amountNet'] as num).toDouble();

      switch (data['status']) {
        case 'draft':
          draftCount++;
          break;
        case 'sent':
          sentCount++;
          break;
        case 'paid':
          paidCount++;
          break;
      }
    }

    return {
      'totalCount': totalCount,
      'totalGross': totalGross,
      'totalNet': totalNet,
      'draftCount': draftCount,
      'sentCount': sentCount,
      'paidCount': paidCount,
    };
  }
}
