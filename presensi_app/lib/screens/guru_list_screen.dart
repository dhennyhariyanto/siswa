import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'guru_form_screen.dart';

class GuruListScreen extends StatefulWidget {
  const GuruListScreen({super.key});

  @override
  State<GuruListScreen> createState() => _GuruListScreenState();
}

class _GuruListScreenState extends State<GuruListScreen> {
  List<dynamic> _guruList = [];
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
        // Fetch all schools for the filter
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
        await _fetchGuru();
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchGuru() async {
    if (_selectedSekolahId == null) return;
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/guru?sekolahid=$_selectedSekolahId');
      if (res['success'] == true) {
        setState(() {
          _guruList = res['data'] ?? [];
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Gagal memuat data guru: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Data Guru')),
      floatingActionButton: _selectedSekolahId == null
          ? null
          : FloatingActionButton(
              child: const Icon(Icons.add),
              onPressed: () async {
                final refresh = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        GuruFormScreen(sekolahId: _selectedSekolahId!),
                  ),
                );
                if (refresh == true) _fetchGuru();
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
                          _guruList = [];
                        });
                        _fetchGuru();
                      },
                    ),
                  ),
                Expanded(
                  child: _selectedSekolahId == null
                      ? const Center(
                          child: Text('Pilih sekolah terlebih dahulu.'),
                        )
                      : _guruList.isEmpty
                      ? const Center(child: Text('Belum ada data guru.'))
                      : ListView.builder(
                          itemCount: _guruList.length,
                          itemBuilder: (context, index) {
                            final item = _guruList[index];
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
                                  'NIP: ${item['nip'] ?? '-'}\nTelp: ${item['notelp'] ?? '-'}\nStatus: ${isInactive ? "Nonaktif" : "Aktif"}',
                                ),
                                trailing: _userRole == 'admin'
                                    ? IconButton(
                                        icon: const Icon(
                                          Icons.edit,
                                          color: Colors.blue,
                                        ),
                                        onPressed: () async {
                                          final refresh = await Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => GuruFormScreen(
                                                sekolahId: _selectedSekolahId!,
                                                guru: item,
                                              ),
                                            ),
                                          );
                                          if (refresh == true) _fetchGuru();
                                        },
                                      )
                                    : null,
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
