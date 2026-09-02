import 'package:flutter/material.dart';
import '../services/api_service.dart';

class GuruFormScreen extends StatefulWidget {
  final String sekolahId;
  final Map<String, dynamic>? guru;
  const GuruFormScreen({super.key, required this.sekolahId, this.guru});

  @override
  State<GuruFormScreen> createState() => _GuruFormScreenState();
}

class _GuruFormScreenState extends State<GuruFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nipController = TextEditingController();
  final _namaController = TextEditingController();
  final _notelpController = TextEditingController();
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  String _jeniskelamin = 'L';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.guru != null) {
      _nipController.text = widget.guru!['nip'] ?? '';
      _namaController.text = widget.guru!['nama'] ?? '';
      _notelpController.text = widget.guru!['notelp'] ?? '';
      _emailController.text = widget.guru!['email'] ?? '';
      _jeniskelamin = widget.guru!['jeniskelamin'] == 'P' ? 'P' : 'L';
      // Note: backend doesn't return username in guru list directly unless we use get by id.
      // Assuming we just let them type username to update/create login.
    }
  }

  @override
  void dispose() {
    _nipController.dispose();
    _namaController.dispose();
    _notelpController.dispose();
    _emailController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final body = {
      'sekolahid': widget.sekolahId,
      'nip': _nipController.text,
      'nama': _namaController.text,
      'jeniskelamin': _jeniskelamin,
      'notelp': _notelpController.text,
      'email': _emailController.text,
    };

    if (_usernameController.text.isNotEmpty) {
      body['username'] = _usernameController.text;
    }
    if (_passwordController.text.isNotEmpty) {
      body['password'] = _passwordController.text;
    }

    try {
      dynamic res;
      if (widget.guru == null) {
        res = await ApiService.post('/guru', body);
      } else {
        res = await ApiService.put('/guru/${widget.guru!['guruid']}', body);
      }

      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Guru berhasil disimpan')),
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
    final isEdit = widget.guru != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Guru' : 'Tambah Guru')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    TextFormField(
                      controller: _nipController,
                      decoration: const InputDecoration(labelText: 'NIP'),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _namaController,
                      decoration: const InputDecoration(labelText: 'Nama Guru'),
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
                      controller: _notelpController,
                      decoration: const InputDecoration(labelText: 'No. Telp'),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(labelText: 'Email'),
                      keyboardType: TextInputType.emailAddress,
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
