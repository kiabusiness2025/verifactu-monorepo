import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'services/remote_config_service.dart';
import 'pages/login_page.dart';
import 'pages/invoices_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Inicializar Remote Config
  await RemoteConfigService().initialize();
  
  runApp(const VerifactuApp());
}

class VerifactuApp extends StatelessWidget {
  const VerifactuApp({super.key});

  @override
  Widget build(BuildContext context) {
    final remoteConfig = RemoteConfigService();
    
    return MaterialApp(
      title: 'Verifactu Business',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Color(int.parse(remoteConfig.primaryColor.replaceFirst('#', '0xFF'))),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
      ),
      home: const HomePage(),
      routes: {
        '/login': (context) => const LoginPage(),
        '/dashboard': (context) => const DashboardPage(),
        '/invoices': (context) => const InvoicesPage(tenantId: 'demo-tenant'),
      },
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final remoteConfig = RemoteConfigService();
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              Navigator.of(context).pushReplacementNamed('/');
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Feature Flags Demo
          if (remoteConfig.isChatEnabled)
            _FeatureCard(
              icon: Icons.chat_bubble_outline,
              title: 'Isaak Chat',
              subtitle: 'Habla con tu asistente IA',
              color: Colors.blue,
              enabled: true,
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Chat próximamente')),
                );
              },
            ),
          
          const SizedBox(height: 12),
          
          _FeatureCard(
            icon: Icons.receipt_long,
            title: 'Facturas',
            subtitle: 'Gestiona tus facturas',
            color: Colors.green,
            enabled: true,
            onTap: () {
              Navigator.pushNamed(context, '/invoices');
            },
          ),
          
          const SizedBox(height: 12),
          
          if (remoteConfig.isMobileScannerEnabled)
            _FeatureCard(
              icon: Icons.qr_code_scanner,
              title: 'Escanear',
              subtitle: 'Escanea tickets y facturas',
              color: Colors.orange,
              enabled: true,
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Scanner próximamente')),
                );
              },
            ),
          
          const SizedBox(height: 24),
          
          // Maintenance Mode Banner
          if (remoteConfig.isMaintenanceMode)
            Card(
              color: Colors.amber[100],
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.amber[900]),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        remoteConfig.maintenanceMessage,
                        style: TextStyle(color: Colors.amber[900]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          const SizedBox(height: 24),
          
          // Remote Config Info
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Remote Config Status',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _ConfigRow('Facturas gratis', '${remoteConfig.freeInvoicesLimit}'),
                  _ConfigRow('Días de trial', '${remoteConfig.trialDays}'),
                  _ConfigRow('Max empresas', '${remoteConfig.maxCompanies}'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Verifactu Business',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo/Icon
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  Icons.receipt_long,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Título
              Text(
                '🚀 Hot Reload Funcionando!',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 16),
              
              // Subtítulo
              Text(
                'Tu asistente inteligente de facturación',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 48),
              
              // Features
              _FeatureCard(
                icon: Icons.cloud_done,
                title: 'Firebase Conectado',
                subtitle: 'Sincronización en tiempo real',
                color: Colors.green,
              ),
              
              const SizedBox(height: 16),
              
              _FeatureCard(
                icon: Icons.analytics_outlined,
                title: 'Gestión Inteligente',
                subtitle: 'Facturas, gastos y beneficios',
                color: Colors.blue,
              ),
              
              const SizedBox(height: 16),
              
              _FeatureCard(
                icon: Icons.verified_outlined,
                title: 'Cumplimiento VeriFactu',
                subtitle: 'Normativa al día',
                color: Colors.orange,
              ),
              
              const SizedBox(height: 48),
              
              // CTA Button
              FilledButton.icon(
                onPressed: () {
                  Navigator.pushNamed(context, '/login');
                },
                icon: const Icon(Icons.login),
                label: const Text('Iniciar Sesión'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              
              OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('¡Registro próximamente!'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                icon: const Icon(Icons.person_add),
                label: const Text('Crear Cuenta'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final bool enabled;
  final VoidCallback? onTap;

  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    this.enabled = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: ListTile(
        enabled: enabled,
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.2),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(subtitle),
        trailing: onTap != null ? const Icon(Icons.arrow_forward_ios, size: 16) : null,
        onTap: onTap,
      ),
    );
  }
}

class _ConfigRow extends StatelessWidget {
  final String label;
  final String value;

  const _ConfigRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
