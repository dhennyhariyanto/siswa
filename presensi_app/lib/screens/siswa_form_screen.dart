import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SiswaFormScreen extends StatefulWidget {
  final String sekolahId;
  final Map<String, dynamic>? siswa;
  const SiswaFormScreen({super.key, required this.sekolahId, this.siswa});

  @override
  State<SiswaFormScreen> createState() => _SiswaFormScreenState();
}

class _SiswaFormScreenState extends State<SiswaFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nisnController = TextEditingController();
  final _namaController = TextEditingController();
  final _tempatlahirController = TextEditingController();
  final _tanggallahirController = TextEditingController();
  final _kelasController = TextEditingController();
  final _alamatController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  String _jeniskelamin = 'L';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.siswa != null) {
      _nisnController.text = widget.siswa!['nisn'] ?? '';
      _namaController.text = widget.siswa!['nama'] ?? '';
      _tempatlahirController.text = widget.siswa!['tempatlahir'] ?? '';
      _tanggallahirController.text =
          widget.siswa!['tanggallahir']?.toString().split('T').first ?? '';
      _kelasController.text = widget.siswa!['kelas'] ?? '';
      _alamatController.text = widget.siswa!['alamat'] ?? '';
      _jeniskelamin = widget.siswa!['jeniskelamin'] == 'P' ? 'P' : 'L';
    }
  }

  @override
  void dispose() {
    _nisnController.dispose();
    _namaController.dispose();
    _tempatlahirController.dispose();
    _tanggallahirController.dispose();
    _kelasController.dispose();
    _alamatController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final body = {
      'sekolahid': widget.sekolahId,
      'nisn': _nisnController.text,
      'nama': _namaController.text,
      'jeniskelamin': _jeniskelamin,
      'kelas': _kelasController.text,
      // mapping Flutter -> backend column
      'notelportu': _alamatController.text,
    };

    if (_usernameController.text.isNotEmpty) {
      body['username'] = _usernameController.text;
    }
    if (_passwordController.text.isNotEmpty) {
      body['password'] = _passwordController.text;
    }

    try {
      dynamic res;
      if (widget.siswa == null) {
        res = await ApiService.post('/siswa', body);
      } else {
        res = await ApiService.put('/siswa/${widget.siswa!['siswaid']}', body);
      }

      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Siswa berhasil disimpan')),
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
    final isEdit = widget.siswa != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Siswa' : 'Tambah Siswa')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    TextFormField(
                      controller: _nisnController,
                      decoration: const InputDecoration(labelText: 'NISN'),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _namaController,
                      decoration: const InputDecoration(
                        labelText: 'Nama Siswa',
                      ),
                      validator: (value) => value == null || value.isEmpty
                          ? 'Nama wajib diisi'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _jeniskelamin,
                      decoration: const InputDecoration(
                        labelText: 'Jenis Kelamin',
                      ),
                      items: const [
                        DropdownMenuItem(value: 'L', child: Text('Laki-laki')),
                        DropdownMenuItem(value: 'P', child: Text('Perempuan')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _jeniskelamin = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _tempatlahirController,
                      decoration: const InputDecoration(
                        labelText: 'Tempat Lahir',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _tanggallahirController,
                      decoration: const InputDecoration(
                        labelText: 'Tanggal Lahir (YYYY-MM-DD)',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _kelasController,
                      decoration: const InputDecoration(labelText: 'Kelas'),
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
