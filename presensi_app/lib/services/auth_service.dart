import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class AuthService {
  static Future<Map<String, dynamic>> login(
    String username,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['data'] != null) {
      final payload = data['data'];
      if (payload['token'] != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', payload['token']);
        if (payload['user'] != null) {
          final user = payload['user'];
          await prefs.setString('role', user['role'] ?? '');
          await prefs.setString('nama', user['username'] ?? '');
          await prefs.setInt('userId', user['userid'] ?? 0);
          if (user['sekolahid'] != null) {
            await prefs.setInt('sekolahId', user['sekolahid']);
          }
        }
      }
    }
    return data;
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<String> getRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('role') ?? '';
  }

  static Future<String> getNama() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('nama') ?? '';
  }

  static Future<int> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('userId') ?? 0;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final role = prefs.getString('role');
    if (role == null) return null;
    return {
      'role': role,
      'nama': prefs.getString('nama'),
      'id': prefs.getInt('userId'),
      'sekolahid': prefs.getInt('sekolahId'),
    };
  }
}
