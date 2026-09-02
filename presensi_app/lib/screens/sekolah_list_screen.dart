import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'sekolah_form_screen.dart';

class SekolahListScreen extends StatefulWidget {
  const SekolahListScreen({super.key});

  @override
  State<SekolahListScreen> createState() => _SekolahListScreenState();
}

class _SekolahListScreenState extends State<SekolahListScreen> {
  List<dynamic> _sekolahList = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchSekolah();
  }

  Future<void> _fetchSekolah() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/sekolah');
      if (res['success'] == true) {
        setState(() {
          _sekolahList = res['data'] ?? [];
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Gagal memuat data sekolah: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Data Sekolah')),
      floatingActionButton: FloatingActionButton(
        child: const Icon(Icons.add),
        onPressed: () async {
          final refresh = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SekolahFormScreen()),
          );
          if (refresh == true) _fetchSekolah();
        },
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _sekolahList.isEmpty
          ? const Center(child: Text('Belum ada data sekolah.'))
          : ListView.builder(
              itemCount: _sekolahList.length,
              itemBuilder: (context, index) {
                final item = _sekolahList[index];
                return Card(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: ListTile(
                    title: Text(
                      item['nama'] ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      '${item['alamat'] ?? '-'}\nTelp: ${item['notelp'] ?? '-'}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit, color: Colors.blue),
                      onPressed: () async {
                        final refresh = await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => SekolahFormScreen(sekolah: item),
                          ),
                        );
                        if (refresh == true) _fetchSekolah();
                      },
                    ),
                  ),
                );
              },
            ),
    );
  }
}
