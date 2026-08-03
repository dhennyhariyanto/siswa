import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:presensi/main.dart';

void main() {
  testWidgets('Splash screen loads', (WidgetTester tester) async {
    await tester.pumpWidget(const PresensiApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
