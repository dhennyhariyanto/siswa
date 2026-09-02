import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'ortu_form_screen.dart';

class OrtuListScreen extends StatefulWidget {
  const OrtuListScreen({super.key});

  @override
  State<OrtuListScreen> createState() => _OrtuListScreenState();
}

class _OrtuListScreenState extends State<OrtuListScreen> {
  List<dynamic> _ortuList = [];
  List<dynamic> _sekolahList = [];
  String? _selectedSekolahId;
  String? _userRole;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initData();
  }

  Future<void> _initData() async {
    setState(() => _isLoading = true);
    try {
      final user = await AuthService.getUser();
      _userRole = user?['role'];
      final userSekolahId = user?['sekolahid']?.toString();

      if (_userRole == 'admin') {
        final resSekolah = await ApiService.get('/sekolah');
        if (resSekolah['success'] == true) {
          _sekolahList = resSekolah['data'] ?? [];
          if (userSekolahId != null && userSekolahId.isNotEmpty) {
            _selectedSekolahId = userSekolahId;
          } else if (_sekolahList.isNotEmpty) {
            _selectedSekolahId = _sekolahList[0]['sekolahid']?.toString();
          }
        }
      } else {
        _selectedSekolahId = userSekolahId;
      }

      if (_selectedSekolahId != null) {
        await _fetchOrtu();
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchOrtu() async {
    if (_selectedSekolahId == null) return;
    setState(() => _isLoading = true);
    try {
      // NOTE: Assuming backend supports ?sekolahid=... for /ortu
      // Let's call /ortu and if it returns all ortu for the school
      final res = await ApiService.get('/ortu?sekolahid=$_selectedSekolahId');
      if (res['success'] == true) {
        setState(() {
          _ortuList = res['data'] ?? [];
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat data orang tua: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Data Orang Tua')),
      floatingActionButton: _selectedSekolahId == null
          ? null
          : FloatingActionButton(
              child: const Icon(Icons.add),
              onPressed: () async {
                final refresh = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        OrtuFormScreen(sekolahId: _selectedSekolahId!),
                  ),
                );
                if (refresh == true) _fetchOrtu();
              },
            ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_userRole == 'admin' && _sekolahList.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: DropdownButtonFormField<String>(
                      value: _selectedSekolahId,
                      decoration: const InputDecoration(
                        labelText: 'Filter Sekolah',
                        border: OutlineInputBorder(),
                      ),
                      items: _sekolahList.map<DropdownMenuItem<String>>((s) {
                        return DropdownMenuItem<String>(
                          value: s['sekolahid']?.toString(),
                          child: Text(s['nama'] ?? ''),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedSekolahId = val;
                          _ortuList = [];
                        });
                        _fetchOrtu();
                      },
                    ),
                  ),
                Expanded(
                  child: _selectedSekolahId == null
                      ? const Center(
                          child: Text('Pilih sekolah terlebih dahulu.'),
                        )
                      : _ortuList.isEmpty
                      ? const Center(child: Text('Belum ada data orang tua.'))
                      : ListView.builder(
                          itemCount: _ortuList.length,
                          itemBuilder: (context, index) {
                            final item = _ortuList[index];
                            final isInactive = item['status'] == 'N';
                            return Card(
                              margin: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              color: isInactive ? Colors.grey[200] : null,
                              child: ListTile(
                                title: Text(
                                  item['nama'] ?? '',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    decoration: isInactive
                                        ? TextDecoration.lineThrough
                                        : null,
                                  ),
                                ),
                                subtitle: Text(
                                  'Siswa ID: ${item['siswaid'] ?? '-'}\nTelp: ${item['notelp'] ?? '-'}\nStatus: ${isInactive ? "Nonaktif" : "Aktif"}',
                                ),
                                trailing: IconButton(
                                  icon: const Icon(
                                    Icons.edit,
                                    color: Colors.blue,
                                  ),
                                  onPressed: () async {
                                    final refresh = await Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => OrtuFormScreen(
                                          sekolahId: _selectedSekolahId!,
                                          ortu: item,
                                        ),
                                      ),
                                    );
                                    if (refresh == true) _fetchOrtu();
                                  },
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
