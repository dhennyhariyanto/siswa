import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'siswa_form_screen.dart';

class SiswaListScreen extends StatefulWidget {
  const SiswaListScreen({super.key});

  @override
  State<SiswaListScreen> createState() => _SiswaListScreenState();
}

class _SiswaListScreenState extends State<SiswaListScreen> {
  List<dynamic> _siswaList = [];
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
        await _fetchSiswa();
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchSiswa() async {
    if (_selectedSekolahId == null) return;
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/siswa?sekolahid=$_selectedSekolahId');
      if (res['success'] == true) {
        setState(() {
          _siswaList = res['data'] ?? [];
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Gagal memuat data siswa: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _uploadFace(String siswaId) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 600,
    );
    if (picked == null) return;

    setState(() => _isLoading = true);
    try {
      final res = await ApiService.uploadAbsensi(
        endpoint: '/siswa/$siswaId/face',
        image: File(picked.path),
        fields: {},
      );
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto wajah berhasil diupload')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message'] ?? 'Gagal upload foto')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _trainFaces() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.post('/siswa/face/train', {});
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Training wajah berhasil')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message'] ?? 'Training gagal')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Siswa'),
        actions: [
          IconButton(
            icon: const Icon(Icons.psychology),
            tooltip: 'Latih Data Wajah',
            onPressed: _trainFaces,
          ),
        ],
      ),
      floatingActionButton: _selectedSekolahId == null
          ? null
          : FloatingActionButton(
              child: const Icon(Icons.add),
              onPressed: () async {
                final refresh = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        SiswaFormScreen(sekolahId: _selectedSekolahId!),
                  ),
                );
                if (refresh == true) _fetchSiswa();
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
                          _siswaList = [];
                        });
                        _fetchSiswa();
                      },
                    ),
                  ),
                Expanded(
                  child: _selectedSekolahId == null
                      ? const Center(
                          child: Text('Pilih sekolah terlebih dahulu.'),
                        )
                      : _siswaList.isEmpty
                      ? const Center(child: Text('Belum ada data siswa.'))
                      : ListView.builder(
                          itemCount: _siswaList.length,
                          itemBuilder: (context, index) {
                            final item = _siswaList[index];
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
                                  'Kelas: ${item['kelas'] ?? '-'}\nNISN: ${item['nisn'] ?? '-'}\nStatus: ${isInactive ? "Nonaktif" : "Aktif"}',
                                ),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(
                                        Icons.camera_alt,
                                        color: Colors.green,
                                      ),
                                      tooltip: 'Daftar Wajah',
                                      onPressed: () => _uploadFace(
                                        item['siswaid'].toString(),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(
                                        Icons.edit,
                                        color: Colors.blue,
                                      ),
                                      onPressed: () async {
                                        final refresh = await Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => SiswaFormScreen(
                                              sekolahId: _selectedSekolahId!,
                                              siswa: item,
                                            ),
                                          ),
                                        );
                                        if (refresh == true) _fetchSiswa();
                                      },
                                    ),
                                  ],
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
