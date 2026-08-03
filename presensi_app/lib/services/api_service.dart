import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class ApiService {
  static Future<Map<String, String>> _headers() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> get(String path) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}$path'),
      headers: await _headers(),
    );
    return _decode(response);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final response = await http.put(
      Uri.parse('${ApiConfig.baseUrl}$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  static Future<dynamic> uploadAbsensi({
    required String endpoint,
    required File image,
    required Map<String, String> fields,
  }) async {
    final token = await AuthService.getToken();
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConfig.baseUrl}$endpoint'),
    );
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields.addAll(fields);
    request.files.add(await http.MultipartFile.fromPath('foto', image.path));
    final response = await request.send();
    final body = await response.stream.bytesToString();
    return _decodeBody(response.statusCode, body);
  }

  static dynamic _decode(http.Response response) {
    return _decodeBody(response.statusCode, response.body);
  }

  static dynamic _decodeBody(int statusCode, String body) {
    dynamic data;
    try {
      data = body.isEmpty ? {} : jsonDecode(body);
    } catch (_) {
      data = {'message': body};
    }
    if (statusCode >= 400) {
      throw Exception(data['message'] ?? data['error'] ?? 'Request gagal');
    }
    return data;
  }
}
