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
`git checkout v3.1.0`
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
`git reset --hard v3.1.0`  
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
9. Wybrać opcję 2 - "**Migruj istniejące konkursy z wersji 2.x**". Ciamk powinien wylistować konkursy, które udało mu się zmigrowąć do nowej wersji Konkursotrona. Akcję można powtarzać, nic nie zostanie zdublowane ani usunięte.
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
`git reset --hard v3.1.0`  
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
9. Wybrać opcję 2 - "**Migruj istniejące konkursy z wersji 2.x**". Ciamk powinien wylistować konkursy, które udało mu się zmigrowąć do nowej wersji Konkursotrona. Akcję można powtarzać, nic nie zostanie zdublowane ani usunięte.
10. Gdyby coś się zaimportowało bez potrzeby, można Ciamkiem konkursy usuwać z listy korzystając z opcji numer dwa.

# Aktualizacja wersji od 3.0 wzwyż

1. Jeśli w systemie jeszcze nie zainstalowano gita, też należy go zainstalować.
2. Otworzyć terminal umożliwiający użycie gita (*PowerShell* lub cmd, nvm nie działa w Git Bashu).
3. Przejść do katalogu, gdzie znajduje się poprzednia wersja aplikacji.
4. Jeśli w konkursie znajdują się pliki, które nie są częścią aplikacji, ale chcemy je zachować, należy w katalogu aplikacji utworzyć folder `temp` (zwrócić uwagę na wielkość liter) i tam je umieścić. To o tyle ważne, że wszystkie pliki nie należące do struktury aplikacji zostaną **usunięte**, ale te w katalogu `temp` zostaną zignorowane.
6. Wpisać po kolei komendy:  
`git fetch origin`  
`git rebase v3.1.0`  
macOS/Linux:  
`nvm install`  
`nvm use`  
`npm i`  
Windows:  
`nvm install $(Get-Content .nvmrc)`  
`nvm use $(Get-Content .nvmrc)`  
`npm i`

# Dodawanie nowego konkursu
1. W arkuszu Excela, z którego zrobiony będzie konkurs, należy użyć nagłówków kolumn:
    * `questionText` - tekst pytania,
    * `question` - typ pytania:
        * puste - tylko tekst,
        * `image` - obrazek,
        * `audio` - plik audio mp3/m4a,
        * `video` - plik wideo mp4,
    * `answer` - tekst odpowiedzi,
    * `answerType` - typ odpowiedzi (takie same typy, jak w `questionType`).  
    * Nie trzeba już podawać dokładnego typu pliku (np. png, webp, mp3), Ciamk znajdzie sobie co trzeba. Dodatkowo, kolumna `id` / `Numer pytania` jest już zbędna i nie jest aplikacji potrzebna, ale można ją zostawić, jeśli jest pomocna przy organizacji plików. Najważniejsze, by w pierwszym wierszu Excela pojawiły się cztery powyższe nagłówki.
2. W katalogu `pytania` utworzyć podkatalog z dowolną nazwą - najlepiej bez spacji, polskich znaków i znaków specjalnych, byle nazwa była unikatowa (w ramach katalogu `pytania`) i dawała jakieś pojęcie, jaki konkurs jest w środku. Na potrzeby instrukcji załóżmy, że ten katalog to `konkursidlo`.
3. Do katalogu `pytania/konkursidlo` wrzucić wszystkie pliki multimedialne.
4. Z arkusza Excela wygenerować plik csv i również wrzucić go do katalogu `pytania/konkursidlo` (może mieć dowolną nazwę, byle był jedynym plikiem csv w tym katalogu).
5. Uruchomić Ciamka przez:
`npm run ciamk`
6. Wybrać opcję 1 - **Dodaj nowy konkurs**.
7. Jeśli wszystko wrzuciliśmy poprawnie, na liście pojawi się nazwa katalogu z konkursem (np. `konkursidlo`).
8. Wybrać z listy konkurs, który chcemy dodać.
9. Jeśli Ciamk stwierdzi jakieś problemy, wyświetli odpowiednie komunikaty na ekranie (np. o brakujących plikach) i przerwie dodawanie konkursu. Można wtedy dokonać poprawek w plikach i ponownie uruchomić opcję dodawania.
10. Jeśli dodawanie się powiedzie, Ciamk zapyta o imię/nick autora konkursu oraz tytuł. Te dane będą się wyświetlać w Konkursotronie.
11. Jeśli w czymkolwiek się pomyliliśmy, opcja 2 po uruchomieniu Ciamka ("Usuń konkurs z listy") pozwala bezproblemowo usunąć konkurs i można go dodać jeszcze raz opcją 1.

# Konfiguracja własna wyglądu

Od wersji 3.1 (Chris Colorado) dostępnych jest kilka opcji konfigurowania wyglądu:

* W ustawieniach znajduje się pole wyboru pozwalające zmienić logo aplikacji. Dostępne są wszystkie poprzednie logówki oraz aktualny + opcja "Własne". Ta ostatnia wymaga wrzucenia do katalogu `res/custom` pliku `logo.png`. Jeśli spróbujemy ją włączyć, a pliku w katalogu nie będzie, aplikacja wróci do aktualnego logo danej wersji.
* W ustawieniach znajdują się też checkboxy dla ekranu zwycięzców: "Własny obrazek" (zamiast domyślnego z Nicolasem Cage'em) i "Własne mp3" (zamiast domyślnej fanfary z Final Fantasy). Aby z nich skorzystać, należy zaznaczyć daną opcję i do katalogu `res/custom` wrzucić własny obrazek `victory.png` i/lub własną mp3 `fanfare.mp3`. Jeśli na koniec konkursu nie zostaną one znalezione w katalogu, użyte zostaną domyślne.
* **Warto wiedzieć:** - katalog `res/custom` jest chroniony, tj. kolejne update'y aplikacji nie zmienią plików w środku, można je tam trzymać bez obaw, że zostaną usunięte.
