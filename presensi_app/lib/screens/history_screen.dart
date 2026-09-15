import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _records = [];
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });
    try {
      final res = await ApiService.get('/absensi/history');
      if (res['success'] == true) {
        setState(() => _records = res['data'] ?? []);
      } else {
        setState(() => _error = res['message'] ?? 'Gagal memuat data');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Color _statusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'hadir':
        return Colors.green;
      case 'terlambat':
        return Colors.orange;
      case 'lebih awal':
        return Colors.blue;
      case 'alpha':
      case 'tidak hadir':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  void _showDetail(Map<String, dynamic> r) {
    showDialog(
      context: context,
      builder: (context) {
        final fotoMasuk = r['fotomasuk'];
        final fotoKeluar = r['fotokeluar'];
        return AlertDialog(
          title: Text(
            'Detail Presensi: ${r['tanggal']?.toString().substring(0, 10) ?? '-'}',
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Nama: ${r['namasiswa'] ?? '-'}'),
                const SizedBox(height: 8),
                Text(
                  'Masuk: ${r['jammasuk'] ?? '-'} (${r['statusmasuk'] ?? '-'})',
                ),
                if (fotoMasuk != null) ...[
                  const SizedBox(height: 8),
                  Image.network(
                    '${ApiConfig.baseUrl.replaceAll('/api', '')}$fotoMasuk',
                    height: 150,
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => const Text(
                      'Gagal muat foto',
                      style: TextStyle(color: Colors.red),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Pulang: ${r['jampulang'] ?? '-'} (${r['statuskeluar'] ?? '-'})',
                ),
                if (fotoKeluar != null) ...[
                  const SizedBox(height: 8),
                  Image.network(
                    '${ApiConfig.baseUrl.replaceAll('/api', '')}$fotoKeluar',
                    height: 150,
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => const Text(
                      'Gagal muat foto',
                      style: TextStyle(color: Colors.red),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Tutup'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Riwayat Presensi'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadHistory),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? Center(
              child: Text(_error, style: const TextStyle(color: Colors.red)),
            )
          : _records.isEmpty
          ? const Center(child: Text('Belum ada riwayat presensi'))
          : RefreshIndicator(
              onRefresh: _loadHistory,
              child: ListView.builder(
                itemCount: _records.length,
                itemBuilder: (context, index) {
                  final r = _records[index];
                  final tanggal =
                      r['tanggal']?.toString().substring(0, 10) ?? '-';
                  final jamMasuk = r['jammasuk']?.toString() ?? '-';
                  final jamPulang = r['jampulang']?.toString() ?? '-';
                  final status = r['statusmasuk']?.toString() ?? '-';
                  final namaSiswa = r['namasiswa']?.toString();
                  final fotoMasuk = r['fotomasuk'];

                  return Card(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    child: ListTile(
                      onTap: () => _showDetail(r),
                      leading: CircleAvatar(
                        backgroundColor: _statusColor(
                          status,
                        ).withValues(alpha: 0.2),
                        backgroundImage: fotoMasuk != null
                            ? NetworkImage(
                                '${ApiConfig.baseUrl.replaceAll('/api', '')}$fotoMasuk',
                              )
                            : null,
                        child: fotoMasuk == null
                            ? Text(
                                status.isNotEmpty
                                    ? status[0].toUpperCase()
                                    : '?',
                                style: TextStyle(
                                  color: _statusColor(status),
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      title: Text(
                        namaSiswa != null ? '$tanggal  •  $namaSiswa' : tanggal,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text('In: $jamMasuk • Out: $jamPulang'),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor(status).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: TextStyle(
                            color: _statusColor(status),
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
