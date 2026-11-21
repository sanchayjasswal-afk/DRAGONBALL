#include <iostream>
#include <sstream>
#include <string>
#include <vector>

enum class IssueType {
    Lint,
    Syntax,
    Test,
    Ticket
};

struct Issue {
    int id;
    std::string title;
    IssueType type;
    bool resolved = false;
};

struct Weapon {
    int id;
    std::string name;
    IssueType specialty;
    int unlockXp;
};

const std::vector<Weapon> weapons = {
    {1, "Lint Blaster", IssueType::Lint, 0},
    {2, "Syntax Shotgun", IssueType::Syntax, 20},
    {3, "Test Railgun", IssueType::Test, 40},
    {4, "Ticket Laser", IssueType::Ticket, 60}
};

std::string typeName(IssueType type) {
    switch (type) {
    case IssueType::Lint: return "Lint";
    case IssueType::Syntax: return "Syntax";
    case IssueType::Test: return "Test";
    case IssueType::Ticket: return "Ticket";
    }
    return "Unknown";
}

void showHelp() {
    std::cout << "\nCommands:\n"
              << "  scan                 Show unresolved code issues\n"
              << "  shoot <issue> <gun>  Fix an issue (example: shoot 2 1)\n"
              << "  status               Show XP, unlocked weapons, and awards\n"
              << "  help                 Show these commands\n"
              << "  quit                 Exit CodeBlaster\n"
              << "Gun IDs are listed by the status command.\n";
}

void showIssues(const std::vector<Issue>& issues) {
    std::cout << "\n--- Issue Scanner ---\n";
    bool foundIssue = false;
    for (const Issue& issue : issues) {
        if (!issue.resolved) {
            std::cout << "  [" << issue.id << "] " << typeName(issue.type)
                      << " - " << issue.title << '\n';
            foundIssue = true;
        }
    }
    if (!foundIssue) {
        std::cout << "  No issues left. Great work!\n";
    }
}

void showStatus(const std::vector<Issue>& issues, int xp) {
    int resolvedCount = 0;
    for (const Issue& issue : issues) {
        if (issue.resolved) {
            ++resolvedCount;
        }
    }

    std::cout << "\n--- Developer Profile ---\n"
              << "XP: " << xp << " | Issues cleared: " << resolvedCount
              << "/" << issues.size() << "\nWeapons:\n";
    for (const Weapon& weapon : weapons) {
        if (xp >= weapon.unlockXp) {
            std::cout << "  [" << weapon.id << "] " << weapon.name
                      << " (specialty: " << typeName(weapon.specialty) << ")\n";
        } else {
            std::cout << "  [locked] " << weapon.name
                      << " - unlock at " << weapon.unlockXp << " XP\n";
        }
    }

    std::cout << "Awards:\n";
    if (resolvedCount >= 1) {
        std::cout << "  * First Fix\n";
    }
    for (IssueType type : {IssueType::Lint, IssueType::Syntax,
                           IssueType::Test, IssueType::Ticket}) {
        bool hasType = false;
        bool allResolved = true;
        for (const Issue& issue : issues) {
            if (issue.type == type) {
                hasType = true;
                allResolved = allResolved && issue.resolved;
            }
        }
        if (hasType && allResolved) {
            std::cout << "  * " << typeName(type) << " Specialist\n";
        }
    }
    if (resolvedCount == static_cast<int>(issues.size())) {
        std::cout << "  * Clean Sweep\n";
    }
    if (resolvedCount == 0) {
        std::cout << "  No awards yet. Clear your first issue!\n";
    }
}

int main() {
    std::vector<Issue> issues = {
        {1, "Unused variable in Player.cpp", IssueType::Lint},
        {2, "Shadowed variable in Score.cpp", IssueType::Lint},
        {3, "Missing semicolon in Enemy.cpp", IssueType::Syntax},
        {4, "Unclosed bracket in Game.cpp", IssueType::Syntax},
        {5, "Player movement test failed", IssueType::Test},
        {6, "Score counter test failed", IssueType::Test},
        {7, "Add a pause screen", IssueType::Ticket},
        {8, "Improve enemy spawn behavior", IssueType::Ticket}
    };
    int xp = 0;

    std::cout << "=================================\n"
              << "       CODEBLASTER: BUG HUNTER\n"
              << "=================================\n"
              << "Clear simulated code issues, earn XP, and unlock weapons.\n"
              << "Type 'help' to see how to play.\n";

    std::string line;
    while (true) {
        std::cout << "\ncodeblaster> ";
        if (!std::getline(std::cin, line)) {
            std::cout << "\nGood game!\n";
            break;
        }

        std::istringstream input(line);
        std::string command;
        input >> command;

        if (command == "quit" || command == "exit") {
            std::cout << "Good game!\n";
            break;
        } else if (command == "help") {
            showHelp();
        } else if (command == "scan") {
            showIssues(issues);
        } else if (command == "status") {
            showStatus(issues, xp);
        } else if (command == "shoot") {
            int issueId = 0;
            int weaponId = 0;
            std::string extra;
            if (!(input >> issueId >> weaponId) || (input >> extra)) {
                std::cout << "Usage: shoot <issue-id> <gun-id>\n";
                continue;
            }

            Issue* target = nullptr;
            for (Issue& issue : issues) {
                if (issue.id == issueId) {
                    target = &issue;
                    break;
                }
            }
            if (target == nullptr) {
                std::cout << "Unknown issue. Use 'scan' to see valid issue IDs.\n";
                continue;
            }
            if (target->resolved) {
                std::cout << "That issue is already cleared.\n";
                continue;
            }

            const Weapon* selectedWeapon = nullptr;
            for (const Weapon& weapon : weapons) {
                if (weapon.id == weaponId) {
                    selectedWeapon = &weapon;
                    break;
                }
            }
            if (selectedWeapon == nullptr) {
                std::cout << "Unknown weapon. Use 'status' to see weapon IDs.\n";
                continue;
            }
            if (xp < selectedWeapon->unlockXp) {
                std::cout << selectedWeapon->name << " is still locked. Keep clearing issues!\n";
                continue;
            }

            target->resolved = true;
            const bool specialistHit = selectedWeapon->specialty == target->type;
            const int earnedXp = specialistHit ? 15 : 10;
            xp += earnedXp;
            std::cout << selectedWeapon->name << " cleared " << target->title
                      << "! +" << earnedXp << " XP";
            if (specialistHit) {
                std::cout << " (specialty bonus)";
            }
            std::cout << ".\n";
            for (const Weapon& weapon : weapons) {
                if (xp >= weapon.unlockXp && xp - earnedXp < weapon.unlockXp) {
                    std::cout << "Weapon unlocked: " << weapon.name << "!\n";
                }
            }
            showStatus(issues, xp);
        } else if (!command.empty()) {
            std::cout << "Unknown command. Type 'help' for available commands.\n";
        }
    }

    return 0;
}
