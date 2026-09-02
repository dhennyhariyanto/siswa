import 'package:flutter/material.dart';
import '../services/api_service.dart';

class OrtuFormScreen extends StatefulWidget {
  final String sekolahId;
  final Map<String, dynamic>? ortu;
  const OrtuFormScreen({super.key, required this.sekolahId, this.ortu});

  @override
  State<OrtuFormScreen> createState() => _OrtuFormScreenState();
}

class _OrtuFormScreenState extends State<OrtuFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _namaController = TextEditingController();
  final _notelpController = TextEditingController();
  final _alamatController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  List<dynamic> _siswaList = [];
  String? _selectedSiswaId;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.ortu != null) {
      _namaController.text = widget.ortu!['nama'] ?? '';
      _notelpController.text = widget.ortu!['notelp'] ?? '';
      _alamatController.text = widget.ortu!['alamat'] ?? '';
      _selectedSiswaId = widget.ortu!['siswaid']?.toString();
    }
    _fetchSiswa();
  }

  Future<void> _fetchSiswa() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/siswa?sekolahid=${widget.sekolahId}');
      if (res['success'] == true) {
        setState(() {
          _siswaList = res['data'] ?? [];
          // Ensure selected siswa exists in list
          if (_selectedSiswaId != null &&
              !_siswaList.any(
                (s) => s['siswaid'].toString() == _selectedSiswaId,
              )) {
            _selectedSiswaId = null;
          }
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

  @override
  void dispose() {
    _namaController.dispose();
    _notelpController.dispose();
    _alamatController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedSiswaId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih siswa terlebih dahulu')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final body = {
      'sekolahid': widget.sekolahId,
      'siswaid': _selectedSiswaId,
      'nama': _namaController.text,
      'notelp': _notelpController.text,
      // ponytail: alamat -> email, tambah field hubungan jika perlu
      'email': _alamatController.text.isEmpty ? null : _alamatController.text,
      'hubungan': 'wali',
    };

    if (_usernameController.text.isNotEmpty) {
      body['username'] = _usernameController.text;
    }
    if (_passwordController.text.isNotEmpty) {
      body['password'] = _passwordController.text;
    }

    try {
      dynamic res;
      if (widget.ortu == null) {
        res = await ApiService.post('/ortu', body);
      } else {
        res = await ApiService.put('/ortu/${widget.ortu!['ortuid']}', body);
      }

      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Orang tua berhasil disimpan')),
          );
          Navigator.pop(context, true);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(res['message'] ?? 'Gagal menyimpan')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.ortu != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Orang Tua' : 'Tambah Orang Tua'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    DropdownButtonFormField<String>(
                      value: _selectedSiswaId,
                      decoration: const InputDecoration(
                        labelText: 'Anak (Siswa)',
                      ),
                      items: _siswaList.map<DropdownMenuItem<String>>((s) {
                        return DropdownMenuItem<String>(
                          value: s['siswaid']?.toString(),
                          child: Text(s['nama'] ?? 'Unknown'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedSiswaId = val;
                        });
                      },
                      validator: (value) =>
                          value == null ? 'Pilih siswa' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _namaController,
                      decoration: const InputDecoration(
                        labelText: 'Nama Orang Tua',
                      ),
                      validator: (value) => value == null || value.isEmpty
                          ? 'Nama wajib diisi'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notelpController,
                      decoration: const InputDecoration(labelText: 'No. Telp'),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _alamatController,
                      decoration: const InputDecoration(labelText: 'Alamat'),
                    ),
                    const Divider(height: 48),
                    const Text(
                      'Data Login (Opsional)',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _usernameController,
                      decoration: const InputDecoration(
                        labelText: 'Username Login',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      decoration: InputDecoration(
                        labelText: isEdit
                            ? 'Password Login (kosongkan jika tidak ubah)'
                            : 'Password Login',
                      ),
                      obscureText: true,
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: _save,
                      child: const Text('Simpan'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
