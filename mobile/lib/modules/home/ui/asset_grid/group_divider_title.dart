import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class GroupDividerTitle extends ConsumerWidget {
  const GroupDividerTitle({
    Key? key,
    required this.text,
    required this.multiselectEnabled,
    required this.onSelect,
    required this.onDeselect,
    required this.selected,
  }) : super(key: key);

  final String text;
  final bool multiselectEnabled;
  final Function onSelect;
  final Function onDeselect;
  final bool selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void handleTitleIconClick() {
      HapticFeedback.heavyImpact();
      if (selected) {
        onDeselect();
      } else {
        onSelect();
      }
    }

    return Padding(
      padding: const EdgeInsets.only(
        top: 12.0,
        bottom: 16.0,
        left: 12.0,
        right: 12.0,
      ),
      child: Row(
        children: [
          Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: handleTitleIconClick,
            child: multiselectEnabled && selected
                ? Icon(
                    Icons.check_circle_rounded,
                    color: Theme.of(context).primaryColor,
                  )
                : const Icon(
                    Icons.check_circle_outline_rounded,
                    color: Colors.grey,
                  ),
          ),
        ],
      ),
    );
  }
}
