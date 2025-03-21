import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:immich_mobile/modules/partner/providers/partner.provider.dart';
import 'package:immich_mobile/modules/partner/services/partner.service.dart';
import 'package:immich_mobile/shared/models/user.dart';
import 'package:immich_mobile/shared/ui/confirm_dialog.dart';
import 'package:immich_mobile/shared/ui/immich_toast.dart';
import 'package:immich_mobile/shared/ui/user_avatar.dart';

class PartnerPage extends HookConsumerWidget {
  const PartnerPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<User> partners = ref.watch(partnerSharedByProvider);
    final availableUsers = ref.watch(partnerAvailableProvider);

    addNewUsersHandler() async {
      final users = availableUsers.value;
      if (users == null || users.isEmpty) {
        ImmichToast.show(
          context: context,
          msg: "partner_page_no_more_users".tr(),
        );
        return;
      }

      final selectedUser = await showDialog<User>(
        context: context,
        builder: (context) {
          return SimpleDialog(
            title: const Text("partner_page_select_partner").tr(),
            children: [
              for (User u in users)
                SimpleDialogOption(
                  onPressed: () => Navigator.pop(context, u),
                  child: Row(
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: userAvatar(context, u),
                      ),
                      Text("${u.firstName} ${u.lastName}"),
                    ],
                  ),
                ),
            ],
          );
        },
      );
      if (selectedUser != null) {
        final ok =
            await ref.read(partnerServiceProvider).addPartner(selectedUser);
        if (ok) {
          ref.invalidate(partnerSharedByProvider);
        } else {
          ImmichToast.show(
            context: context,
            msg: "partner_page_partner_add_failed".tr(),
            toastType: ToastType.error,
          );
        }
      }
    }

    onDeleteUser(User u) {
      return showDialog(
        context: context,
        builder: (BuildContext context) {
          return ConfirmDialog(
            title: "partner_page_stop_sharing_title",
            content:
                "partner_page_stop_sharing_content".tr(args: [u.firstName]),
            onOk: () => ref.read(partnerServiceProvider).removePartner(u),
          );
        },
      );
    }

    buildUserList(List<User> users) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 16.0, top: 16.0),
            child: const Text(
              "partner_page_shared_to_title",
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey,
                fontWeight: FontWeight.bold,
              ),
            ).tr(),
          ),
          if (users.isNotEmpty)
            ListView.builder(
              shrinkWrap: true,
              itemCount: users.length,
              itemBuilder: ((context, index) {
                return ListTile(
                  leading: userAvatar(context, users[index]),
                  title: Text(
                    users[index].email,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.person_remove),
                    onPressed: () => onDeleteUser(users[index]),
                  ),
                );
              }),
            ),
          if (users.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: const Text(
                      "partner_page_empty_message",
                      style: TextStyle(fontSize: 14),
                    ).tr(),
                  ),
                  ElevatedButton.icon(
                    onPressed: availableUsers.whenOrNull(
                      data: (data) => addNewUsersHandler,
                    ),
                    icon: const Icon(Icons.person_add),
                    label: const Text("partner_page_add_partner").tr(),
                  ),
                ],
              ),
            ),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text("partner_page_title").tr(),
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            onPressed:
                availableUsers.whenOrNull(data: (data) => addNewUsersHandler),
            icon: const Icon(Icons.person_add),
            tooltip: "partner_page_add_partner".tr(),
          ),
        ],
      ),
      body: buildUserList(partners),
    );
  }
}
