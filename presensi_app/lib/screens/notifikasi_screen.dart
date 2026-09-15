import 'package:flutter/material.dart';
import '../services/api_service.dart';

class NotifikasiScreen extends StatefulWidget {
  const NotifikasiScreen({super.key});

  @override
  State<NotifikasiScreen> createState() => _NotifikasiScreenState();
}

class _NotifikasiScreenState extends State<NotifikasiScreen> {
  List<dynamic> _notifs = [];
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadNotif();
  }

  Future<void> _loadNotif() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });
    try {
      final res = await ApiService.get('/notifikasi');
      if (res['success'] == true) {
        setState(() => _notifs = res['data'] ?? []);
      } else {
        setState(() => _error = res['message'] ?? 'Gagal memuat notifikasi');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markRead(int id) async {
    try {
      await ApiService.put('/notifikasi/$id/read', {});
      _loadNotif();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Gagal tandai dibaca')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifikasi'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadNotif),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? Center(
              child: Text(_error, style: const TextStyle(color: Colors.red)),
            )
          : _notifs.isEmpty
          ? const Center(child: Text('Tidak ada notifikasi'))
          : RefreshIndicator(
              onRefresh: _loadNotif,
              child: ListView.builder(
                itemCount: _notifs.length,
                itemBuilder: (context, index) {
                  final n = _notifs[index];
                  final isRead = n['isread'] == 1 || n['isread'] == true;
                  return ListTile(
                    tileColor: isRead
                        ? null
                        : Colors.blue.withValues(alpha: 0.1),
                    leading: Icon(
                      n['tipe'] == 'presensi' ? Icons.how_to_reg : Icons.info,
                      color: isRead ? Colors.grey : Colors.blue,
                    ),
                    title: Text(
                      n['judul'] ?? '',
                      style: TextStyle(
                        fontWeight: isRead
                            ? FontWeight.normal
                            : FontWeight.bold,
                      ),
                    ),
                    subtitle: Text(n['pesan'] ?? ''),
                    trailing: Text(
                      n['createddate']?.toString().substring(0, 10) ?? '',
                      style: const TextStyle(fontSize: 10),
                    ),
                    onTap: () {
                      if (!isRead) _markRead(n['notifikasiid']);
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: Text(n['judul'] ?? ''),
                          content: Text(n['pesan'] ?? ''),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('OK'),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
    );
  }
}
