import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'absensi_screen.dart';
import 'history_screen.dart';
import 'siswa_list_screen.dart';
import 'guru_list_screen.dart';
import 'sekolah_list_screen.dart';
import 'ortu_list_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _nama = '';
  String _role = '';

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final nama = await AuthService.getNama();
    final role = await AuthService.getRole();
    if (mounted) {
      setState(() {
        _nama = nama;
        _role = role;
      });
    }
  }

  void _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/login');
  }

  @override
  Widget build(BuildContext context) {
    final bool isAdmin = _role == 'admin';
    final bool isGuru = _role == 'guru';
    final bool isSiswa = _role == 'siswa';

    // Data master menu items (admin: all 4, guru: siswa+ortu, siswa: none)
    final List<_MenuData> dataMaster = [
      if (isAdmin)
        _MenuData('Sekolah', Icons.account_balance, Colors.indigo, () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SekolahListScreen()),
          );
        }),
      if (isAdmin || isGuru)
        _MenuData('Siswa', Icons.people, Colors.green, () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SiswaListScreen()),
          );
        }),
      if (isAdmin || isGuru)
        _MenuData('Ortu', Icons.family_restroom, Colors.purple, () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const OrtuListScreen()),
          );
        }),
      if (isAdmin)
        _MenuData('Guru', Icons.school, Colors.teal, () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const GuruListScreen()),
          );
        }),
    ];

    // Feature menu items (for all roles)
    final List<_MenuData> featureMenu = [
      if (isSiswa || isGuru)
        _MenuData('Presensi Wajah', Icons.camera_alt, Colors.blue, () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AbsensiScreen()),
          );
        }),
      _MenuData('Riwayat Presensi', Icons.history, Colors.orange, () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const HistoryScreen()),
        );
      }),
      // Tambah menu baru di sini jika diperlukan
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6FA),
      appBar: AppBar(
        title: const Text(
          'Presensi Sekolah',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
        backgroundColor: const Color(0xFF1565C0),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header greeting ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
            decoration: const BoxDecoration(
              color: Color(0xFF1565C0),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(28),
                bottomRight: Radius.circular(28),
              ),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.white24,
                  child: Icon(Icons.person, size: 32, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Selamat datang,',
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _nama.isEmpty ? 'Memuat...' : _nama,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Data Master section ──
                  if (dataMaster.isNotEmpty) ...[
                    const Text(
                      'Data Master',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.black54,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: dataMaster.map((m) {
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: _buildSmallCard(m),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // ── Feature menus ──
                  const Text(
                    'Menu',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.black54,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ...featureMenu.map(
                    (m) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildFeatureCard(m),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Small card for Data Master row (4-column)
  Widget _buildSmallCard(_MenuData m) {
    return GestureDetector(
      onTap: m.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: m.color.withOpacity(0.12),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: m.color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(m.icon, size: 22, color: m.color),
            ),
            const SizedBox(height: 6),
            Text(
              m.label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.black87,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  /// Wide card for feature menus (full-width row)
  Widget _buildFeatureCard(_MenuData m) {
    return GestureDetector(
      onTap: m.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: m.color.withOpacity(0.12),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: m.color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(m.icon, size: 26, color: m.color),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                m.label,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87,
                ),
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }
}

class _MenuData {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _MenuData(this.label, this.icon, this.color, this.onTap);
}
