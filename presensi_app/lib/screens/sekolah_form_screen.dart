import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SekolahFormScreen extends StatefulWidget {
  final Map<String, dynamic>? sekolah;
  const SekolahFormScreen({super.key, this.sekolah});

  @override
  State<SekolahFormScreen> createState() => _SekolahFormScreenState();
}

class _SekolahFormScreenState extends State<SekolahFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _namaController = TextEditingController();
  final _alamatController = TextEditingController();
  final _notelpController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.sekolah != null) {
      _namaController.text = widget.sekolah!['nama'] ?? '';
      _alamatController.text = widget.sekolah!['alamat'] ?? '';
      _notelpController.text = widget.sekolah!['notelp'] ?? '';
    }
  }

  @override
  void dispose() {
    _namaController.dispose();
    _alamatController.dispose();
    _notelpController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final body = {
      'nama': _namaController.text,
      'alamat': _alamatController.text,
      'notelp': _notelpController.text,
    };

    try {
      dynamic res;
      if (widget.sekolah == null) {
        res = await ApiService.post('/sekolah', body);
      } else {
        res = await ApiService.put(
          '/sekolah/${widget.sekolah!['sekolahid']}',
          body,
        );
      }

      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Sekolah berhasil disimpan')),
          );
          Navigator.pop(context, true);
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
    final isEdit = widget.sekolah != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Sekolah' : 'Tambah Sekolah')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    TextFormField(
                      controller: _namaController,
                      decoration: const InputDecoration(
                        labelText: 'Nama Sekolah',
                      ),
                      validator: (value) => value == null || value.isEmpty
                          ? 'Nama wajib diisi'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _alamatController,
                      decoration: const InputDecoration(labelText: 'Alamat'),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notelpController,
                      decoration: const InputDecoration(labelText: 'No. Telp'),
                      keyboardType: TextInputType.phone,
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
