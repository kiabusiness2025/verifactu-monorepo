import 'dart:convert';
import 'package:firebase_remote_config/firebase_remote_config.dart';

/// Servicio para manejar Remote Config (Feature Flags)
class RemoteConfigService {
  final FirebaseRemoteConfig _remoteConfig = FirebaseRemoteConfig.instance;

  // Singleton
  static final RemoteConfigService _instance = RemoteConfigService._internal();
  factory RemoteConfigService() => _instance;
  RemoteConfigService._internal();

  bool _initialized = false;

  // Inicializar Remote Config
  Future<void> initialize() async {
    if (_initialized) return;

    await _remoteConfig.setConfigSettings(RemoteConfigSettings(
      fetchTimeout: const Duration(minutes: 1),
      minimumFetchInterval: const Duration(hours: 1),
    ));

    // Valores por defecto
    await _remoteConfig.setDefaults({
      // Feature Flags
      'feature_isaak_chat': true,
      'feature_isaak_proactive': true,
      'feature_isaak_deadlines': true,
      'feature_new_dashboard': false,
      'feature_mobile_scanner': true,
      'feature_offline_mode': false,

      // UI Configuration
      'ui_theme_primary_color': '#00C853',  // 🟢 Verde Material (era #0060F0 azul)
      'ui_show_onboarding': true,
      'ui_max_companies': 3,
      'ui_items_per_page': 20,

      // Business Logic
      'pricing_free_invoices_limit': 10,
      'pricing_trial_days': 14,
      'pricing_min_amount': 0.01,

      // API Configuration
      'api_timeout_ms': 30000,
      'api_retry_attempts': 3,

      // Maintenance
      'maintenance_mode': false,
      'maintenance_message': 'Estamos realizando mantenimiento. Volveremos pronto.',
    });

    try {
      await _remoteConfig.fetchAndActivate();
      _initialized = true;
    } catch (e) {
      // Si falla, usar valores por defecto
      print('Error fetching Remote Config: $e');
      _initialized = true;
    }
  }

  // Obtener Feature Flag (boolean)
  bool getFeatureFlag(String key) {
    return _remoteConfig.getBool(key);
  }

  // Obtener string
  String getString(String key) {
    return _remoteConfig.getString(key);
  }

  // Obtener número
  int getInt(String key) {
    return _remoteConfig.getInt(key);
  }

  double getDouble(String key) {
    return _remoteConfig.getDouble(key);
  }

  // Obtener objeto JSON
  Map<String, dynamic>? getJSON(String key) {
    final jsonString = _remoteConfig.getString(key);
    if (jsonString.isEmpty) return null;

    try {
      return jsonDecode(jsonString) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  // Forzar refresh de valores
  Future<void> refresh() async {
    await _remoteConfig.fetchAndActivate();
  }

  // Feature Flags específicos
  bool get isChatEnabled => getFeatureFlag('feature_isaak_chat');
  bool get isProactiveEnabled => getFeatureFlag('feature_isaak_proactive');
  bool get isDeadlinesEnabled => getFeatureFlag('feature_isaak_deadlines');
  bool get isNewDashboard => getFeatureFlag('feature_new_dashboard');
  bool get isMobileScannerEnabled => getFeatureFlag('feature_mobile_scanner');
  bool get isOfflineModeEnabled => getFeatureFlag('feature_offline_mode');

  // UI Configuration
  String get primaryColor => getString('ui_theme_primary_color');
  bool get showOnboarding => getFeatureFlag('ui_show_onboarding');
  int get maxCompanies => getInt('ui_max_companies');
  int get itemsPerPage => getInt('ui_items_per_page');

  // Business Logic
  int get freeInvoicesLimit => getInt('pricing_free_invoices_limit');
  int get trialDays => getInt('pricing_trial_days');
  double get minAmount => getDouble('pricing_min_amount');

  // Maintenance
  bool get isMaintenanceMode => getFeatureFlag('maintenance_mode');
  String get maintenanceMessage => getString('maintenance_message');
}
