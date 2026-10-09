#!/usr/bin/env python
"""
Skrip Pemulihan Darurat Password Admin (Emergency Admin Password Reset Tool)
SI-SANTRI - SMP NEGERI 2 PANJI

Digunakan oleh Tim IT / Administrator Server ketika pengelola sekolah lupa password admin.
Dapat dijalankan secara interaktif atau dengan argumen CLI.

Contoh Penggunaan:
  1. Interaktif:
     python reset_admin_password.py

  2. Dengan argumen:
     python reset_admin_password.py --username admin --password "KombinasiAman2026!"
"""

import argparse
import asyncio
import getpass
import sys

from database import db, client
from auth_utils import hash_password, now_jakarta


async def reset_password(username: str, new_password: str):
    username = username.strip()
    if not username:
        print("[ERROR] Username tidak boleh kosong.")
        sys.exit(1)

    if len(new_password) < 8:
        print("[ERROR] Password admin minimal 8 karakter demi keamanan sekolah.")
        sys.exit(1)

    # Cari user admin
    admin = await db.users.find_one({"role": "admin", "username": username})
    now = now_jakarta()
    new_hash = hash_password(new_password)

    if admin:
        # Update existing admin
        await db.users.update_one(
            {"_id": admin["_id"]},
            {
                "$set": {
                    "password_hash": new_hash,
                    "must_change_password": False,
                    "is_active": True,
                    "updated_at": now,
                }
            },
        )
        print("\n" + "=" * 50)
        print(f"[BERHASIL] Password untuk admin '{username}' telah diperbarui!")
        print(f"ID Akun   : {admin['_id']}")
        print(f"Peran     : {admin.get('role', 'admin')}")
        print(f"Waktu     : {now.isoformat()}")
        print("=" * 50)
        print("Silakan login kembali melalui aplikasi SI-SANTRI dengan password baru.\n")
    else:
        # Jika belum ada akun admin dengan username tersebut, tawarkan untuk dibuatkan
        print(f"[INFO] Akun admin dengan username '{username}' belum ditemukan.")
        print(f"[MEMBUAT] Membuat akun admin baru dengan username '{username}'...")

        admin_id = f"U_ADMIN_{username.upper()}"
        admin_doc = {
            "_id": admin_id,
            "role": "admin",
            "username": username,
            "password_hash": new_hash,
            "display_name": f"Admin ({username})",
            "ref_id": f"REF_{username.upper()}",
            "is_active": True,
            "must_change_password": False,
            "created_at": now,
        }
        await db.users.insert_one(admin_doc)
        print("\n" + "=" * 50)
        print(f"[BERHASIL] Akun admin baru '{username}' telah dibuat dan siap digunakan!")
        print(f"ID Akun   : {admin_id}")
        print(f"Peran     : admin")
        print("=" * 50 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Reset Password Admin Darurat SI-SANTRI (Emergency Admin Password Reset Tool)"
    )
    parser.add_argument(
        "--username",
        "-u",
        default="admin",
        help="Username admin yang akan direset (default: 'admin')",
    )
    parser.add_argument(
        "--password",
        "-p",
        help="Password baru (minimal 8 karakter). Jika tidak diisi, akan ditanyakan secara interaktif.",
    )

    args = parser.parse_args()

    username = args.username
    password = args.password

    if not password:
        print("=" * 55)
        print("   SI-SANTRI: PEMULIHAN DARURAT PASSWORD ADMIN   ")
        print("   SMP NEGERI 2 PANJI, SITUBONDO                 ")
        print("=" * 55)
        print(f"Target Username: {username}")
        password = getpass.getpass("Masukkan Password Baru (min 8 karakter): ")
        confirm = getpass.getpass("Ketik Ulang Password Baru            : ")

        if password != confirm:
            print("\n[ERROR] Konfirmasi password tidak cocok. Pembatalan dilakukan.")
            sys.exit(1)

    try:
        asyncio.run(reset_password(username, password))
    finally:
        client.close()


if __name__ == "__main__":
    main()
