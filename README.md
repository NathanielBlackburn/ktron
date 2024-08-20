# Instalacja

1. Jeśli w systemie dla potrzeb Konkursotrona zainstalowany były *XAMPP*, *MAMP* lub *PHP*, można je bez obaw usunąć, nie będą już potrzebne.
2. Należy zainstalować *NVM (Node Version Manager)*
Windows: https://www.freecodecamp.org/news/nvm-for-windows-how-to-download-and-install-node-version-manager-in-windows-10/#heading-how-to-download-and-install-node-version-manager-in-windows-10
Posiadacze Linuxa czy macOSa raczej potrafią instalować rzeczy na swoich komputerach, a jeśli tak nie jest, to niech poproszą o pomoc znajomego z IT ;)
3. Jeśli w systemie jeszcze nie zainstalowano gita, też należy go zainstalować.
Windows: https://git-scm.com/download/win
4. Otworzyć terminal umożliwiający użycie gita (*PowerShell* lub cmd, nvm nie działa w Git Bashu).
5. W miejscu, gdzie chcemy umieścić aplikację, wpisać komendy:  
`git clone git@github.com:NathanielBlackburn/ktron.git`  
`cd ktron`  
`git checkout 3.0.0`
macOS/Linux:
`nvm install`  
`nvm use`  
`npm i`  
Windows:  
`nvm install $(Get-Content .nvmrc)`  
`nvm use $(Get-Content .nvmrc)`  
`npm i`
6. Konkursotron jest gotowy do pracy, można dodawać nowe konkursy.

# Aktualizacja z wersji 2.x, jeśli KTron był zainstalowany "ręcznie", przez kopiowanie z cudzego kompa ;)

1. Jeśli w systemie dla potrzeb Konkursotrona zainstalowany były *XAMPP*, *MAMP* lub *PHP*, można je bez obaw usunąć, nie będą już potrzebne.
2. Należy zainstalować *NVM (Node Version Manager)*
Windows: https://www.freecodecamp.org/news/nvm-for-windows-how-to-download-and-install-node-version-manager-in-windows-10/#heading-how-to-download-and-install-node-version-manager-in-windows-10
Posiadacze Linuxa czy macOSa raczej potrafią instalować rzeczy na swoich komputerach, a jeśli tak nie jest, to niech poproszą o pomoc znajomego z IT ;)
3. Jeśli w systemie jeszcze nie zainstalowano gita, też należy go zainstalować.
Windows: https://git-scm.com/download/win
4. Otworzyć terminal umożliwiający użycie gita (*PowerShell* lub cmd, nvm nie działa w Git Bashu).
5. Przejść do katalogu, gdzie znajduje się poprzednia wersja aplikacji.
6. Jeśli w konkursie znajdują się pliki, które nie są częścią aplikacji, ale chcemy je zachować, należy w katalogu aplikacji utworzyć folder `temp` (zwrócić uwagę na wielkość liter) i tam je umieścić. To o tyle ważne, że wszystkie pliki nie należące do struktury aplikacji zostaną **usunięte**, ale te w katalogu `temp` zostaną zignorowane.
7. Wpisać po kolei komendy:  
`git init .` (uwaga, na końcu jest kropka, nie przejmować się ostrzeżeniami)  
`git remote add origin https://github.com/NathanielBlackburn/ktron.git`  
`git fetch origin`  
`git reset --hard 3.0.0`  
`git clean -df`  
macOS/Linux:  
`nvm install`  
`nvm use`  
`npm i`  
Windows:  
`nvm install $(Get-Content .nvmrc)`  
`nvm use $(Get-Content .nvmrc)`  
`npm i`
8. Wpisać komendę `npm run ciamk`. **Ciamk** to nowy programik, który w tej chwili służy do migrowania konkursów między wersjami, w przyszłości będzie też służył do importowania konkursów (import jest już prawie gotowy, ale brakuje mu jeszcze paru pierdółek, więc go nie udostępniam).
9. Wybrać opcję 1 - "**Migruj istniejące konkursy z wersji 2.x**". Ciamk powinien wylistować konkursy, które udało mu się zmigrowąć do nowej wersji Konkursotrona. Akcję można powtarzać, nic nie zostanie zdublowane ani usunięte.
10. Gdyby coś się zaimportowało bez potrzeby, można Ciamkiem konkursy usuwać z listy korzystając z opcji numer dwa.

# Aktualizacja z wersji 2.x, jeśli KTron był zainstalowany gitem z Bitbucketa

1. Jeśli w systemie dla potrzeb Konkursotrona zainstalowany były *XAMPP*, *MAMP* lub *PHP*, można je bez obaw usunąć, nie będą już potrzebne.
2. Należy zainstalować *NVM (Node Version Manager)*
Windows: https://www.freecodecamp.org/news/nvm-for-windows-how-to-download-and-install-node-version-manager-in-windows-10/#heading-how-to-download-and-install-node-version-manager-in-windows-10
Posiadacze Linuxa czy macOSa raczej potrafią instalować rzeczy na swoich komputerach, a jeśli tak nie jest, to niech poproszą o pomoc znajomego z IT ;)
3. Jeśli w systemie jeszcze nie zainstalowano gita, też należy go zainstalować.
Windows: https://git-scm.com/download/win
4. Otworzyć terminal umożliwiający użycie gita (*PowerShell* lub cmd, nvm nie działa w Git Bashu).
5. Przejść do katalogu, gdzie znajduje się poprzednia wersja aplikacji.
6. Jeśli w konkursie znajdują się pliki, które nie są częścią aplikacji, ale chcemy je zachować, należy w katalogu aplikacji utworzyć folder `temp` (zwrócić uwagę na wielkość liter) i tam je umieścić. To o tyle ważne, że wszystkie pliki nie należące do struktury aplikacji zostaną **usunięte**, ale te w katalogu `temp` zostaną zignorowane.
7. Wpisać po kolei komendy:  
`git remote set-url origin https://github.com/NathanielBlackburn/ktron.git`  
`git fetch origin`  
`git reset --hard 3.0.0-Beta-1`  
`git clean -df`  
macOS/Linux:  
`nvm install`  
`nvm use`  
`npm i`  
Windows:  
`nvm install $(Get-Content .nvmrc)`  
`nvm use $(Get-Content .nvmrc)`  
`npm i`
8. Wpisać komendę `npm run ciamk`. **Ciamk** to nowy programik, który w tej chwili służy do migrowania konkursów między wersjami, w przyszłości będzie też służył do importowania konkursów (import jest już prawie gotowy, ale brakuje mu jeszcze paru pierdółek, więc go nie udostępniam).
9. Wybrać opcję 1 - "**Migruj istniejące konkursy z wersji 2.x**". Ciamk powinien wylistować konkursy, które udało mu się zmigrowąć do nowej wersji Konkursotrona. Akcję można powtarzać, nic nie zostanie zdublowane ani usunięte.
10. Gdyby coś się zaimportowało bez potrzeby, można Ciamkiem konkursy usuwać z listy korzystając z opcji numer dwa.
